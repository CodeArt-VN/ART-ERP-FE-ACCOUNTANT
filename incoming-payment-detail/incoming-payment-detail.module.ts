import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { IncomingPaymentDetailPage } from './incoming-payment-detail.page';
import { IncomingPaymentInvoiceModalPage } from '../incoming-payment-invoice-modal/incoming-payment-invoice-modal.page';
import { IncomingPaymentSaleOrderModalPage } from '../incoming-payment-sale-order-modal/incoming-payment-sale-order-modal.page';

const routes: Routes = [
  {
    path: '',
    component: IncomingPaymentDetailPage
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
  declarations: [IncomingPaymentDetailPage, IncomingPaymentSaleOrderModalPage, IncomingPaymentInvoiceModalPage]
})
export class IncomingPaymentDetailPageModule { }
