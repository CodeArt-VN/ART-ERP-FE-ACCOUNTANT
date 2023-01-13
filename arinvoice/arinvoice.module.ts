import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ARInvoicePage } from './arinvoice.page';
import { ShareModule } from 'src/app/share.module';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxMaskModule } from 'ngx-mask';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    NgSelectModule,
    NgOptionHighlightModule,
    ShareModule,
    NgxMaskModule.forRoot(),
    RouterModule.forChild([{ path: '', component: ARInvoicePage }])
  ],
  declarations: [ARInvoicePage]
})
export class ARInvoicePageModule {}
