export const policy: {live_seconds:number;delayed_seconds:number;stale_seconds:number;cache_seconds:number;poll_seconds:number;timeout_ms:number;max_upstream_per_minute_per_isolate:number;max_response_bytes:number;max_cached_observations:number};
export function freshness(timestamp:number|null,now?:number):string;
export function normalize(payload:unknown,received?:number):any;
export class ObservationService {constructor(fetcher?:typeof fetch,clock?:()=>number,random?:()=>number);query(lat:number,lon:number):Promise<any>;health():any}
export const observations:ObservationService;
