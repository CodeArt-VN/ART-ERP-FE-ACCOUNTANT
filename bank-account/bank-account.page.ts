import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BANK_AccountProvider } from 'src/app/services/static/services.service';
import { BankAccountDetailPage } from '../bank-account-detail/bank-account-detail.page';

@Component({
	selector: 'app-bank-account',
	templateUrl: 'bank-account.page.html',
	styleUrls: ['bank-account.page.scss'],
	standalone: false,
})
export class BankAccountPage extends PageBase {
	itemsState: any = [];
	isAllRowOpened = true;

	constructor(
		public pageProvider: BANK_AccountProvider,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController
	) {
		super();
		this.pageConfig.forceLoadData = true;
		this.query.Take = 5000;
		this.query.AllChildren = true;
		this.query.AllParent = true;
	}

	loadedData(event) {
		this.buildFlatTree(this.items, this.itemsState, this.isAllRowOpened).then((resp: any) => {
			this.itemsState = resp;
		});
		super.loadedData(event);
	}

	toggleRowAll() {
		this.isAllRowOpened = !this.isAllRowOpened;
		this.itemsState.forEach((i) => {
			i.showdetail = !this.isAllRowOpened;
			this.toggleRow(this.itemsState, i, true);
		});
	}
}
