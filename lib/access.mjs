/** Roles come only from trusted hosting identity and server configuration. Never from a URL/form/localStorage. */
export function resolveAccess(headers,config={}){
 const userId=headers.get('oai-authenticated-user-id'),email=headers.get('oai-authenticated-user-email');
 if(!userId||!email)return {authenticated:false,roles:[],role:null,operator_authorised:false,admin_authorised:false,organisation_id:null};
 const list=s=>typeof s==='string'?s.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean):[];
 const admin=list(config.AEROSHARE_ADMIN_USER_IDS).includes(userId.toLowerCase())||list(config.AEROSHARE_ADMIN_EMAILS).includes(email.trim().toLowerCase());
 let org=null;try{const records=JSON.parse(config.AEROSHARE_OPERATOR_MEMBERSHIPS||'[]');if(Array.isArray(records)){const membership=records.find(x=>x&&x.user_id===userId&&x.verified===true&&typeof x.organisation_id==='string'&&/^[a-zA-Z0-9_-]{3,80}$/.test(x.organisation_id));org=membership?.organisation_id||null}}catch{}
 const roles=['customer',...(org?['operator']:[]),...(admin?['admin']:[])];return {authenticated:true,roles,role:admin?'admin':org?'operator':'customer',operator_authorised:!!org,admin_authorised:admin,organisation_id:org,user_id:userId};
}
export function accessStatus(access,role){return !access.authenticated?401:access.roles.includes(role)?200:403}
