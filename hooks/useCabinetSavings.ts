import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { useAlert } from '@/template';
import { useAuth } from '@/hooks/useAuth';
import { useMedications } from '@/hooks/useMedications';
import { fetchGoodRxPrices } from '@/services/educationService';
import type { GoodRxResult, PharmacyPrice } from '@/services/educationService';

interface PriceRequest {
  id: string;
  name: string;
  dosage: string;
  quantity?: number;
  form: string;
}

interface SavingsState {
  ownerId: string | null;
  requestKey: string;
  results: Record<string, GoodRxResult>;
  loading: boolean;
}

export function useCabinetSavings() {
  const { user } = useAuth();
  const { medications, loading: cabinetLoading, error: cabinetError } = useMedications();
  const { showAlert } = useAlert();
  const [search, setSearch] = useState('');
  const [zipInput, setZipInput] = useState('');
  const [zip, setZip] = useState('');
  const [zipError, setZipError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [state, setState] = useState<SavingsState>({ ownerId: null, requestKey: '', results: {}, loading: false });

  const activeMedications = useMemo(
    () => medications.filter(m => m.status === 'active' || m.status === 'expiring'),
    [medications],
  );
  const filteredMedications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activeMedications.filter(m => !query || `${m.name} ${m.genericName} ${m.brandName}`.toLowerCase().includes(query));
  }, [activeMedications, search]);
  const selectedMedication = filteredMedications.find(m => m.id === selectedId) ?? filteredMedications[0] ?? null;

  // Stable, formulation-specific key: changing a note does not refetch every price.
  const signature = JSON.stringify(activeMedications.map(m => ({
    id: m.id, name: m.name, dosage: m.strength,
    quantity: m.quantity > 0 ? m.quantity : undefined, form: m.form,
  })));
  const ownerId = user?.id ?? null;
  const requestKey = `${signature}|${zip}|${revision}`;

  useEffect(() => {
    let cancelled = false;
    const requests = JSON.parse(signature) as PriceRequest[];
    setState({ ownerId, requestKey, results: {}, loading: Boolean(ownerId && requests.length) });
    if (!ownerId || requests.length === 0) return;

    const load = async () => {
      // At most two concurrent calls, one per active cabinet medication.
      for (let i = 0; i < requests.length; i += 2) {
        if (cancelled) return;
        const batch = requests.slice(i, i + 2);
        const results = await Promise.all(batch.map(async medication => ({
          id: medication.id,
          result: await fetchGoodRxPrices({
            name: medication.name, dosage: medication.dosage,
            quantity: medication.quantity, form: medication.form, zip,
          }),
        })));
        if (cancelled) return;
        setState(previous => {
          const next = { ...previous.results };
          for (const item of results) next[item.id] = item.result;
          return { ownerId, requestKey, results: next, loading: i + 2 < requests.length };
        });
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [signature, ownerId, zip, revision, requestKey]);

  const updateZipInput = useCallback((value: string) => {
    setZipInput(value.replace(/\D/g, '').slice(0, 5));
    setZipError('');
  }, []);
  const applyZip = useCallback(() => {
    if (!/^\d{5}$/.test(zipInput)) {
      setZipError('Enter a five-digit US ZIP code.');
      return;
    }
    setZipError('');
    setZip(zipInput);
    setRevision(value => value + 1);
  }, [zipInput]);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  const selectMedication = useCallback((id: string) => setSelectedId(id), []);
  const openOffer = useCallback(async (offer: PharmacyPrice) => {
    if (offer.offerUrl) {
      try {
        await Linking.openURL(offer.offerUrl);
      } catch {
        showAlert('Could not open offer', 'Please try again or contact the pharmacy to confirm the current price.');
      }
      return;
    }
    showAlert(offer.pharmacyName, [
      `Provider price: ${offer.displayPrice}`,
      offer.dosage, offer.form,
      offer.quantity > 0 ? `Quantity: ${offer.quantity}` : '',
      offer.couponCode ? `Provider coupon code: ${offer.couponCode}` : '',
      'No online redemption link was supplied. Confirm eligibility and the current price with the pharmacy.',
    ].filter(Boolean).join('\n'));
  }, [showAlert]);

  const currentState = state.ownerId === ownerId && state.requestKey === requestKey ? state : null;
  const selectedResult = selectedMedication ? currentState?.results[selectedMedication.id] ?? null : null;
  const loading = Boolean(ownerId && activeMedications.length && (!currentState || currentState.loading));

  return {
    activeMedications, filteredMedications, selectedMedication, selectedResult,
    offers: selectedResult?.data ?? [], loading, cabinetLoading, cabinetError,
    search, setSearch, zipInput, updateZipInput, zip, zipError, applyZip,
    selectMedication, retry, openOffer,
  };
}
