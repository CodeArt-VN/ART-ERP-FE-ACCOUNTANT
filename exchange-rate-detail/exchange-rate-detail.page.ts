import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { SYS_CurrencyProvider, SYS_ExchangeRateProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-exchange-rate-detail',
	templateUrl: './exchange-rate-detail.page.html',
	styleUrls: ['./exchange-rate-detail.page.scss'],
	standalone: false,
})
export class ExchangeRateDetailPage extends PageBase {
	currenciesDataSource = this.buildSelectDataSource((term) => {
		return this.currencyProvider.search({
			SortBy: ['Id_desc'],
			Take: 20,
			Skip: 0,
			Keyword: term,
		});
	});

	constructor(
		public pageProvider: SYS_ExchangeRateProvider,
		public currencyProvider: SYS_CurrencyProvider,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public navParams: NavParams,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController
	) {
		super();
		this.pageConfig.isDetailPage = true;
		this.id = this.route.snapshot.paramMap.get('id');
		this.formGroup = this.formBuilder.group({
			Id: new FormControl({ value: '', disabled: true }),
			Code: ['', Validators.required],
			Name: [''],
			Rate: ['', Validators.required],
			ExchangeDate: ['', Validators.required],
		});
	}

	preLoadData() {
		if (this.navParams) {
			this.item = JSON.parse(JSON.stringify(this.navParams.data?.item));
			this.id = this.navParams.data?.id;
			this.loadData();
		}
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		super.loadedData(event, ignoredFromGroup);
		const code = this.formGroup.get('Code')?.value;
		if (code) {
			const name = this.formGroup.get('Name')?.value || code;
			this.currenciesDataSource.selected = [{ Code: code, Name: name }];
		} else {
			this.currenciesDataSource.selected = [];
		}
		this.currenciesDataSource.initSearch();
	}

	async saveChange() {
		return this.saveChange2();
	}

	delete(publishEventCode = this.pageConfig.pageName) {
		if (this.pageConfig.ShowDelete) {
			this.env
				.actionConfirm('delete', this.selectedItems.length, this.item?.Name, this.pageConfig.pageTitle, () =>
					this.pageProvider.delete(this.pageConfig.isDetailPage ? this.item : this.selectedItems)
				)
				.then((_) => {
					this.env.showMessage('DELETE_RESULT_SUCCESS', 'success');
					this.env.publishEvent({ Code: publishEventCode });

					if (this.pageConfig.isDetailPage) {
						this.deleted();
						this.closeModal();
					}
				})
				.catch((err: any) => {
					if (err != 'User abort action') this.env.showMessage('DELETE_RESULT_FAIL', 'danger');
					console.log(err);
				});
		}
	}
}
