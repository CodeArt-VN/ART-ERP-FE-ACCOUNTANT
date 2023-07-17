import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { ARInvoiceDetailPage } from './ar-invoice-detail.page';

import { ARInvoiceComponentsModule } from './components/ar-invoice-components.module';

const routes: Routes = [
  {
    path: '',
    component: ARInvoiceDetailPage
  }
];

@NgModule({
  imports: [
    ARInvoiceComponentsModule,
    ShareModule,
    RouterModule.forChild(routes)
  ],
  declarations: [ARInvoiceDetailPage]
})
export class ARInvoiceDetailPageModule { }
