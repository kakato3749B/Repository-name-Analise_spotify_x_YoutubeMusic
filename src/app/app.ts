import { Component } from '@angular/core';
import { DashboardPowerbiStreamingComponent } from './dashboard-powerbi-streaming/dashboard-powerbi-streaming.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DashboardPowerbiStreamingComponent],
  template: `<app-dashboard-powerbi-streaming></app-dashboard-powerbi-streaming>`,
})
export class AppComponent {}