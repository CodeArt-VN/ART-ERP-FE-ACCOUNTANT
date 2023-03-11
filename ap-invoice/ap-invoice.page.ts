import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { AC_APInvoiceProvider} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';

@Component({
    selector: 'app-ap-invoice',
    templateUrl: 'ap-invoice.page.html',
    styleUrls: ['ap-invoice.page.scss']
})
export class APInvoicePage extends PageBase {
    statusList = [];
    constructor(
        public pageProvider: AC_APInvoiceProvider,
        public modalController: ModalController,
		public popoverCtrl: PopoverController,
        public alertCtrl: AlertController,
        public loadingController: LoadingController,
        public env: EnvService,
        public navCtrl: NavController,
        public location: Location,
    ) {
        super();
    }

    preLoadData(event?: any): void {
        this.env.getStatus('APInvoice').then((result)=>{
            this.statusList = result;
            super.preLoadData();
        });
    }

}
