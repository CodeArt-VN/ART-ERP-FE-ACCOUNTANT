import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { APInvoicePage } from './ap-invoice.page';
import { ShareModule } from 'src/app/share.module';
import { APInvoiceBKAVModalPage } from '../ap-invoice-bkav-modal/ap-invoice-bkav-modal.page';

@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ShareModule, RouterModule.forChild([{ path: '', component: APInvoicePage }])],
	declarations: [APInvoicePage, APInvoiceBKAVModalPage],
})
export class APInvoicePageModule {}
