import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { SYS_CurrencyProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-currency-detail',
	templateUrl: './currency-detail.page.html',
	styleUrls: ['./currency-detail.page.scss'],
	standalone: false,
})
export class CurrencyDetailPage extends PageBase {
	constructor(
		public pageProvider: SYS_CurrencyProvider,
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
			Name: ['', Validators.required],
			Decimals: ['', Validators.required],
			Remark: [''],
			ForeignName: [''],
			DiffDebitAccount: [''],
			DiffCreditAccount: [''],
			RevalDebitAccount: [''],
			RevalCreditAccount: [''],
			Read1: [''],
			Read2: [''],
			Read3: [''],
			Read4: [''],
			Read5: [''],
			ReadEn1: [''],
			ReadEn2: [''],
			ReadEn3: [''],
			ReadEn4: [''],
			ReadEn5: [''],
		});
	}

	preLoadData() {
		if (this.navParams) {
			this.item = JSON.parse(JSON.stringify(this.navParams.data?.item));
			this.id = this.navParams.data?.id;
			this.loadData();
		}
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
