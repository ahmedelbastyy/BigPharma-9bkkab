import { useCallback,useEffect,useMemo,useState } from 'react';
import type { ProductOption } from '@/services/rxtermsSearchService';
export function useFormulationPagination(options:ProductOption[]){const [limit,setLimit]=useState(20);useEffect(()=>setLimit(20),[options]);const visible=useMemo(()=>options.slice(0,limit),[options,limit]),loadMore=useCallback(()=>setLimit(value=>value+20),[]);return {visible,loadMore,hasMore:limit<options.length};}
