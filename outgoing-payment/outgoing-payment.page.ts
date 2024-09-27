import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BANK_OutgoingPaymentProvider, BRA_BranchProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { SortConfig } from 'src/app/models/options-interface';

@Component({
  selector: 'app-outgoing-payment',
  templateUrl: 'outgoing-payment.page.html',
  styleUrls: ['outgoing-payment.page.scss'],
})
export class OutgoingPaymentPage extends PageBase {
  statusList: [];
  constructor(
    public pageProvider: BANK_OutgoingPaymentProvider,
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
  }

  preLoadData(event?: any): void {
    let sorted: SortConfig[] = [{ Dimension: 'Id', Order: 'DESC' }];
    this.pageConfig.sort = sorted;

    Promise.all([this.env.getStatus('PaymentStatus')]).then((values: any) => {
      if (values.length) {
        this.statusList = values[0].filter((d) => d.Code != 'PaymentStatus');
      }
      super.preLoadData(event);
    });
  }
}
