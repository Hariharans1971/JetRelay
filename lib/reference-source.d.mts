export function referenceOrigin(value:string|null):string|null;
export function validateManifest(m:any,now?:number):any;
export class ReferenceSource{constructor(origin:string|null,bundled:any,fetcher?:typeof fetch,clock?:()=>number);state():Promise<any>;peek():any;url(path:string,state?:any):string|null}
