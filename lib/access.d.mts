export type Access={authenticated:boolean;roles:string[];role:string|null;operator_authorised:boolean;admin_authorised:boolean;organisation_id:string|null;user_id?:string};
export function resolveAccess(headers:Headers,config?:Record<string,unknown>):Access;
export function accessStatus(access:Access,role:string):number;
