import { TenxyteHttpClient, HttpClientOptions } from './http/client';
import { AuthModule } from './modules/auth';
import { SecurityModule } from './modules/security';
import { RbacModule } from './modules/rbac';
import { UserModule } from './modules/user';

export class TenxyteClient {
    public http: TenxyteHttpClient;
    public auth: AuthModule;
    public security: SecurityModule;
    public rbac: RbacModule;
    public user: UserModule;

    constructor(options: HttpClientOptions) {
        this.http = new TenxyteHttpClient(options);
        this.auth = new AuthModule(this.http);
        this.security = new SecurityModule(this.http);
        this.rbac = new RbacModule(this.http);
        this.user = new UserModule(this.http);
    }
}
