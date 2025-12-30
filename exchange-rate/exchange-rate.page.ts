import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { SYS_ExchangeRateProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ExchangeRateDetailPage } from '../exchange-rate-detail/exchange-rate-detail.page';

@Component({
	selector: 'app-exchange-rate',
	templateUrl: 'exchange-rate.page.html',
	styleUrls: ['exchange-rate.page.scss'],
	standalone: false,
})
export class ExchangeRatePage extends PageBase {
	constructor(
		public pageProvider: SYS_ExchangeRateProvider,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location
	) {
		super();
	}

	preLoadData(event) {
		this.query.SortBy = 'Id_desc';
		super.preLoadData(event);
	}

	add(): void {
		const newItem = {
			Id: 0,
			IsDisabled: false,
		};
		this.showModal(newItem);
	}

	async showModal(i) {
		const modal = await this.modalController.create({
			component: ExchangeRateDetailPage,
			componentProps: {
				id: i.Id,
				item: i,
			},
			cssClass: 'modal90',
		});
		return await modal.present();
	}
}
