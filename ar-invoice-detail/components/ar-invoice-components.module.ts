import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ShareModule } from 'src/app/share.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { GoogleMapsModule } from '@angular/google-maps';

import { RouterModule } from '@angular/router';
import { MapCompsModule } from 'src/app/components/map-comps/map-comps.module';
import { ChildInvoiceComponent } from './child-invoice/child-invoice.component';
import { ARContactModalPage } from './ar-contact-modal/ar-contact-modal.page';
import { BusinessPartnerComponentsModule } from 'src/app/pages/CRM/business-partner-detail/components/business-partner-components.module';

@NgModule({
	imports: [IonicModule, CommonModule, ShareModule, RouterModule, FormsModule, MapCompsModule, ReactiveFormsModule, GoogleMapsModule, BusinessPartnerComponentsModule],
	declarations: [ChildInvoiceComponent, ARContactModalPage],
	exports: [ChildInvoiceComponent, ARContactModalPage],
})
export class ARInvoiceComponentsModule {}
