import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BANK_IncomingPaymentProvider, BRA_BranchProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { SortConfig } from 'src/app/models/options-interface';

@Component({
    selector: 'app-incoming-payment',
    templateUrl: 'incoming-payment.page.html',
    styleUrls: ['incoming-payment.page.scss']
})
export class IncomingPaymentPage extends PageBase {
    constructor(
        public pageProvider: BANK_IncomingPaymentProvider,
        public branchProvider: BRA_BranchProvider,
        public modalController: ModalController,
		public popoverCtrl: PopoverController,
        public alertCtrl: AlertController,
        public loadingController: LoadingController,
        public env: EnvService,
        public navCtrl: NavController,
        public location: Location,
    ) {
        super();
        this.pageConfig.canDelete = true;
        this.pageConfig.canAdd = true;
    }
    statusList: [];

    preLoadData(event?: any): void {
        let sorted: SortConfig[] = [
            { Dimension: 'Id', Order: 'DESC' }
        ];
        this.pageConfig.sort = sorted;

        Promise.all([
            this.env.getStatus('PaymentStatus'),

        ]).then((values:any) => {
            if(values.length){
                this.statusList = values[0].filter(d => d.Code != 'PaymentStatus');
            }
            super.preLoadData(event);
        })

    }
}
