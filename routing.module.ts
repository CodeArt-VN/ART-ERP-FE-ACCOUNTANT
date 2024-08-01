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

   { path: 'bank-statement', loadChildren: () => import('./bank-statement/bank-statement.module').then(m => m.BankStatementPageModule), canActivate: [AuthGuard] },
   { path: 'bank-statement/:id', loadChildren: () => import('./bank-statement-detail/bank-statement-detail.module').then(m => m.BankStatementDetailPageModule), canActivate: [AuthGuard] },

   { path: 'bank-account', loadChildren: () => import('./bank-account/bank-account.module').then(m => m.BankAccountPageModule), canActivate: [AuthGuard] },
   { path: 'bank-account/:id', loadChildren: () => import('./bank-account-detail/bank-account-detail.module').then(m => m.BankAccountDetailPageModule), canActivate: [AuthGuard] },
   
   { path: 'statement-matching-criteria', loadChildren: () => import('./statement-matching-criteria/statement-matching-criteria.module').then(m => m.StatementMatchingCriteriaPageModule), canActivate: [AuthGuard] },
   { path: 'statement-matching-criteria/:id', loadChildren: () => import('./statement-matching-criteria-detail/statement-matching-criteria-detail.module').then(m => m.StatementMatchingCriteriaDetailPageModule), canActivate: [AuthGuard] },
   

];
