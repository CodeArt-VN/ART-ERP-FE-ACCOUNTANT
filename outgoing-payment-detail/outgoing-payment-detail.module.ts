import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { OutgoingPaymentDetailPage } from './outgoing-payment-detail.page';
import { OutgoingPaymentPurchaseOrderModalPage } from '../outgoing-payment-purchase-order-modal/outgoing-payment-purchase-order-modal.page';
import { OutgoingPaymentInvoiceModalPage } from '../outgoing-payment-invoice-modal/outgoing-payment-invoice-modal.page';

const routes: Routes = [
  {
    path: '',
    component: OutgoingPaymentDetailPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    ShareModule,
    RouterModule.forChild(routes)                                                        
  ],
  declarations: [OutgoingPaymentDetailPage,OutgoingPaymentPurchaseOrderModalPage,OutgoingPaymentInvoiceModalPage]
})
export class OutgoingPaymentDetailPageModule { }
                                               