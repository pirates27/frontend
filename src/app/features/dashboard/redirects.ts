import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

function getRolePath(role: string | null): string {
  if (role === 'PROVIDER') return 'provider';
  if (role === 'GOVERNMENT_OFFICER') return 'officer';
  if (role === 'ADMIN') return 'admin';
  return 'buyer';
}

@Component({
  selector: 'app-profile-redirect',
  standalone: true,
  template: '',
})
export class ProfileRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    const role = this.auth.getUserRole();
    const rolePath = getRolePath(role);
    this.router.navigate([`/dashboard/${rolePath}/profile`]);
  }
}

@Component({
  selector: 'app-notifications-redirect',
  standalone: true,
  template: '',
})
export class NotificationsRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    const role = this.auth.getUserRole();
    const rolePath = getRolePath(role);
    this.router.navigate([`/dashboard/${rolePath}/notifications`]);
  }
}

@Component({
  selector: 'app-properties-redirect',
  standalone: true,
  template: '',
})
export class PropertiesRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const role = this.auth.getUserRole();
    const rolePath = getRolePath(role);
    if (id) {
      this.router.navigate([`/dashboard/${rolePath}/properties/${id}`]);
    } else {
      this.router.navigate([`/dashboard/${rolePath}`]);
    }
  }
}

@Component({
  selector: 'app-ai-chat-redirect',
  standalone: true,
  template: '',
})
export class AiChatRedirectComponent implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.router.navigate([`/dashboard/buyer/ai-chat`]);
  }
}
