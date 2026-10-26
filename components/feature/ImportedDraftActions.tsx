import { ImportMatchRetry } from './ImportMatchRetry';
interface ImportedDraftActionsProps {busy:boolean;action:(name:string,payload?:Record<string,unknown>)=>Promise<void>}
export function ImportedDraftActions({busy,action}:ImportedDraftActionsProps){return <ImportMatchRetry busy={busy} retry={()=>{void action('import_retry_matches');}}/>;}
