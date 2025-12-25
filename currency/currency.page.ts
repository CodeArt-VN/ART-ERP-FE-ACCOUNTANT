import { ChangeDetectorRef, Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, SYS_CurrencyProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { SYS_Currency, SYS_Translate } from 'src/app/models/model-list-interface';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-currency',
	templateUrl: 'currency.page.html',
	styleUrls: ['currency.page.scss'],
	standalone: false,
})
export class CurrencyPage extends PageBase {
	constructor(
		public pageProvider: SYS_CurrencyProvider,
		public branchProvider: BRA_BranchProvider,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
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
		this.items.unshift({
			Id: 0,
			Code: '',
			Name: '',
			Remark: '',
			Decimals: '',
		});

		this.editRow(this.items[0]);
	}

	editRow(row) {
		row.isEdit = true;
		//Create formGroup of row
		row._formGroup = this.formBuilder.group({
			Id: new FormControl({ value: row.Id, disabled: true }),
			Code: [row.Code, Validators.required],
			Name: [row.Name, Validators.required],
			Decimals: [row.Decimals, Validators.required],
			Remark: [row.Remark]
		});
	}

	cancelRow(row) {
		if (row.Id === 0) {
			this.items = this.items.filter((e) => e.Id !== 0);
		} else {
			row.isEdit = false;
		}
	}

	saveRow(row) {
		this.saveChange2(row._formGroup, '')
			.then((data: SYS_Currency) => {
				if (row.Id === 0 && data) {
					lib.copyPropertiesValue(data, row);
				} else {
					lib.copyPropertiesValue(row._formGroup.value, row);
				}
				row.isEdit = false;
			})
			.catch((err) => {
				if (err.error?.InnerException?.InnerException?.ExceptionMessage?.includes('Cannot insert duplicate key row')) {
					debugger;
					this.env.showMessage('Cannot insert duplicate key resource', 'danger');
				} else {
					this.env.showMessage('Cannot save, please try again', 'danger');
				}
			});
	}
}
