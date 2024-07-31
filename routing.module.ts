import { Routes } from '@angular/router';
import { AuthGuard } from 'src/app/guards/app.guard';

export const ACCOUNTTANTRoutes: Routes = [
  
  //ACCOUNTANT

  { path: 'ar-invoice', loadChildren: () => import('./arinvoice/arinvoice.module').then(m => m.ARInvoicePageModule), canActivate: [AuthGuard] },
  { path: 'ar-invoice/:id', loadChildren: () => import('./ar-invoice-detail/ar-invoice-detail.module').then(m => m.ARInvoiceDetailPageModule), canActivate: [AuthGuard] },

  { path: 'ap-invoice', loadChildren: () => import('./ap-invoice/ap-invoice.module').then(m => m.APInvoicePageModule), canActivate: [AuthGuard] },
  { path: 'ap-invoice/:id', loadChildren: () => import('./ap-invoice-detail/ap-invoice-detail.module').then(m => m.APInvoiceDetailPageModule), canActivate: [AuthGuard] },

  { path: 'incoming-payment', loadChildren: () => import('./incoming-payment/incoming-payment.module').then(m => m.IncomingPaymentPageModule), canActivate: [AuthGuard] },
  { path: 'incoming-payment/:id', loadChildren: () => import('./incoming-payment-detail/incoming-payment-detail.module').then(m => m.IncomingPaymentDetailPageModule), canActivate: [AuthGuard] },

];
