import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, LoadingController, AlertController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
	BANK_AccountProvider,
	BANK_IncomingPaymentDetailProvider,
	BANK_IncomingPaymentProvider,
	BRA_BranchProvider,
	CRM_ContactProvider,
	HRM_StaffProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, FormControl, FormArray, Validators } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { IncomingPaymentSaleOrderModalPage } from '../incoming-payment-sale-order-modal/incoming-payment-sale-order-modal.page';
import { IncomingPaymentInvoiceModalPage } from '../incoming-payment-invoice-modal/incoming-payment-invoice-modal.page';

@Component({
	selector: 'app-incoming-payment-detail',
	templateUrl: './incoming-payment-detail.page.html',
	styleUrls: ['./incoming-payment-detail.page.scss'],
	standalone: false,
})
export class IncomingPaymentDetailPage extends PageBase {
	statusList: [];
	typeDataSource: any;
	paymentReasonList = [];
	SelectedOrderList: any;
	SelectedInvoiceList: any;
	bankAccountList = [];
	constructor(
		public pageProvider: BANK_IncomingPaymentProvider,
		public IncomingPaymentDetailservice: BANK_IncomingPaymentDetailProvider,
		public bankAccountProvider: BANK_AccountProvider,
		public branchProvider: BRA_BranchProvider,
		public staffProvider: HRM_StaffProvider,
		public popoverCtrl: PopoverController,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public modalController: ModalController,
		public contactProvider: CRM_ContactProvider,
		public alertCtrl: AlertController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public commonService: CommonService
	) {
		super();
		this.pageConfig.isDetailPage = true;

		this.formGroup = formBuilder.group({
			IDBranch: [this.env.selectedBranch],
			Id: new FormControl({ value: '', disabled: true }),
			IDTransaction: new FormControl({ value: '', disabled: true }),
			IDAccount : [''],
			Name: [''],
			Code: [''],
			DocumentDate: ['', Validators.required],
			PostingDate: ['', Validators.required],
			DueDate: ['', Validators.required],
			Type: ['', Validators.required],
			SubType: [''],
			Remark: [''],
			Amount: ['', Validators.required],
			Status: ['', Validators.required],
			IDCustomer: ['', Validators.required],
			PaymentReason: [''],
			IDStaff: [''],
			IncomingPaymentDetails: this.formBuilder.array([]),
			IsDisabled: new FormControl({ value: '', disabled: true }),
			IsDeleted: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: false }),
			ModifiedDate: new FormControl({ value: '', disabled: false }),
			DeletedFields: [[]],
		});
	}

	preLoadData(event?: any): void {
		Promise.all([this.env.getStatus('PaymentStatus'), this.env.getType('PaymentType'), this.env.getType('IncomingPaymentReason'),this.bankAccountProvider.read()]).then((values: any) => {
			if (values.length) {
				this.statusList = values[0].filter((d) => d.Code != 'PaymentStatus');
				this.typeDataSource = values[1].filter((d) => d.Code == 'Cash' || d.Code == 'Card' || d.Code == 'Transfer');
				if (values[2].length == 0)
					this.paymentReasonList = [
						{ Name: 'Payment of invoice', Code: 'PaymentOfInvoice' },
						{ Name: 'Payment of sale order', Code: 'PaymentOfSO' },
					];
				this.bankAccountList = values[3].data;
			}
			super.preLoadData(event);
		});
	}

	loadData(event?: any): void {
		this.id = typeof this.id == 'string' ? parseInt(this.id) : this.id;
		this.query.id = this.id;
		if (this.id) {
			this.pageProvider.commonService
				.connect('GET', 'BANK/IncomingPayment/GetAnItemIncomingPayment/', this.query)
				.toPromise()
				.then((ite: any) => {
					this.item = ite;
					this.loadedData(event);
				})
				.catch((err) => {
					console.log(err);

					if ((err.status = 404)) {
						this.nav('not-found', 'back');
					} else {
						this.item = null;
						this.loadedData(event);
					}
				});
		} else if (this.id == 0) {
			if (!this.item) this.item = {};

			Object.assign(this.item, this.DefaultItem);
			this.loadedData(event);
		} else {
			this.loadedData(event);
		}
	}

	amountOrder = 0;
	amountInvoice = 0;
	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		let IDCustomerDisabled = true;
		if (this.item?.Status == 'Success') {
			if (this.item.IDCustomer == null && this.pageConfig.canEdit) {
				IDCustomerDisabled = false;
			}
			this.pageConfig.canEdit = false;
		}

		super.loadedData(event, ignoredFromGroup);
		this.amountOrder = 0;
		this.amountInvoice = 0;
		let formArray = this.formGroup.get('IncomingPaymentDetails') as FormArray;
		formArray.clear();
		this.item.IncomingPaymentDetails?.forEach((i) => {
			if (i.IDSaleOrder && i.IDInvoice == null) {
				this.amountOrder += i.Amount;
			}
			if (i.IDInvoice) {
				this.amountInvoice += i.Amount;
			}
			this.addField(i);
		});
		if (this.item?.Id && this.item?.Customer) {
			this._contactDataSource.selected = [];
			this._contactDataSource.selected.push(this.item.Customer);
		}
		if (this.item._Owner) {
			this._staffDataSource.selected = [...[], this.item._Owner];
		}
		if (!this.formGroup.get('Id').value) {
			this.formGroup.get('IDStaff').markAsDirty();
		}
		this._staffDataSource.initSearch();
		this._contactDataSource.initSearch();

		if (!IDCustomerDisabled || this.pageConfig.canEditCustomer) {
			this.formGroup.controls['IDCustomer'].enable();
		}
	}

	sortDetail: any = {};
	sortToggle(field) {
		if (!this.sortDetail[field]) {
			this.sortDetail[field] = field;
		} else if (this.sortDetail[field] == field) {
			this.sortDetail[field] = field + '_desc';
		} else {
			delete this.sortDetail[field];
		}

		if (Object.keys(this.sortDetail).length === 0) {
			this.refresh();
		} else {
			this.reInitIncomingPaymentCountDetails();
		}
	}

	reInitIncomingPaymentCountDetails() {
		const IncomingPaymentDetailsArray = this.formGroup.get('IncomingPaymentDetails') as FormArray;
		this.item.IncomingPaymentDetails = IncomingPaymentDetailsArray.getRawValue();
		for (const key in this.sortDetail) {
			if (this.sortDetail.hasOwnProperty(key)) {
				const value = this.sortDetail[key];
				this.sortByKey(value);
			}
		}
		IncomingPaymentDetailsArray.clear();
		this.item.IncomingPaymentDetails.forEach((s) => this.addField(s));
	}

	sortByKey(key: string, desc: boolean = false) {
		if (key.includes('_desc')) {
			key = key.replace('_desc', '');
			desc = true;
		}
		this.item.IncomingPaymentDetails.sort((a, b) => {
			const comparison = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
			return desc ? -comparison : comparison;
		});
	}

	addField(field: any, markAsDirty = false) {
		let groups = <FormArray>this.formGroup.controls.IncomingPaymentDetails;
		let group = this.formBuilder.group({
			IDIncomingPayment: [this.item.Id],
			Id: new FormControl({ value: field.Id, disabled: false }),
			IDSaleOrder: new FormControl({ value: field.IDSaleOrder, disabled: false }),
			IDCustomer: new FormControl({ value: field.IDCustomer, disabled: false }),
			IDInvoice: new FormControl({ value: field.IDInvoice, disabled: false }),
			Name: new FormControl({ value: field.Name, disabled: false }),
			Remark: new FormControl({ value: field.Remark, disabled: false }),
			Amount: new FormControl({ value: field.Amount, disabled: false }),
		});
		groups.push(group);
		if (markAsDirty) {
			group.get('IDIncomingPayment').markAsDirty();
			group.get('Id').markAsDirty();
			group.get('IDSaleOrder').markAsDirty();
			group.get('IDCustomer').markAsDirty();
			group.get('IDInvoice').markAsDirty();
			group.get('Name').markAsDirty();
			group.get('Remark').markAsDirty();
			group.get('Amount').markAsDirty();
			this.formGroup.get('IncomingPaymentDetails').markAsDirty();
		}
	}

	changeType(e) {
		this.formGroup.get('Type').setValue(e.Code);
		this.formGroup.get('Type').markAsDirty();
		this.saveChange();
	}

	incomingPaymentOrderDetails: any;
	async showOrderModal() {
		this.incomingPaymentOrderDetails = [...this.formGroup.controls.IncomingPaymentDetails.value];
		this.SelectedOrderList = this.formGroup.controls.IncomingPaymentDetails?.value;
		const modal = await this.modalController.create({
			component: IncomingPaymentSaleOrderModalPage,
			componentProps: {
				IDContact: this.formGroup.controls.IDCustomer.value,
				//amount: this.amountOrder,
				amount: this.formGroup.get('Amount').value,
				SelectedOrderList: this.SelectedOrderList,
				canEditAmount: this.formGroup.get('Amount').value > 0 ? false : true,
				amountInvoice: this.amountInvoice,
			},
			cssClass: 'modal90',
		});

		await modal.present();
		const { data } = await modal.onWillDismiss();
		this.SelectedOrderList = [];
		if (data && data.length) {
			let deletedFields = [];
			let dataIds = [];
			for (let i = 0; i < data.length; i++) {
				const e = data[i];
				this.SelectedOrderList.push(e);
				if (!this.incomingPaymentOrderDetails.some((item) => item.IDSaleOrder === e.IDSaleOrder)) {
					this.addField(e, true);
				} else {
					this.updateField(e);
				}
				dataIds = data.map((e) => e.IDSaleOrder);
			}
			this.incomingPaymentOrderDetails.forEach((x) => {
				if (!dataIds.includes(x.IDSaleOrder) && x.IDInvoice == null) {
					if (x.Id) {
						deletedFields.push(x.Id);
					} else {
						let groups = <FormArray>this.formGroup.controls.IncomingPaymentDetails;
						let index = groups.controls.findIndex((d) => d.value.IDSaleOrder == x.IDSaleOrder);
						groups.removeAt(index);
					}
				}
			});
			if (deletedFields.length && this.formGroup.controls.Id.value) {
				deletedFields.forEach((deletedId) => {
					let groups = <FormArray>this.formGroup.controls.IncomingPaymentDetails;
					let index = groups.controls.findIndex((d) => d.value.Id == deletedId);
					groups.removeAt(index);
				});
				this.removeField(deletedFields);
			}
			this.amountOrder = data.Amount;
			if (this.formGroup.get('Amount').value <= 0) {
				this.formGroup.get('Amount').setValue(data.Amount + this.amountInvoice);
				this.formGroup.get('Amount').markAsDirty();
			}
			if (this.formGroup.valid) {
				this.saveChange();
			}
		}
	}

	async showInvoiceModal() {
		this.incomingPaymentOrderDetails = [...this.formGroup.controls.IncomingPaymentDetails.value];
		this.SelectedInvoiceList = this.formGroup.controls.IncomingPaymentDetails?.value;
		const modal = await this.modalController.create({
			component: IncomingPaymentInvoiceModalPage,
			componentProps: {
				IDBusinessPartner: this.formGroup.controls.IDCustomer.value,
				//amount: this.amountInvoice,
				amount: this.formGroup.get('Amount').value,
				SelectedInvoiceList: this.SelectedInvoiceList,
				amountOrder: this.amountOrder,
			},
			cssClass: 'modal90',
		});

		await modal.present();
		const { data } = await modal.onWillDismiss();
		this.SelectedInvoiceList = [];
		if (data && data.length) {
			let deletedFields = [];
			let dataIds = [];
			for (let i = 0; i < data.length; i++) {
				const e = data[i];
				this.SelectedInvoiceList.push(e);
				e.IDSaleOrder = null;
				if (!this.incomingPaymentOrderDetails.some((item) => item.IDInvoice === e.IDInvoice)) {
					this.addField(e, true);
				} else {
					this.updateField(e);
				}
				dataIds = data.map((e) => e.IDInvoice);
			}
			this.incomingPaymentOrderDetails.forEach((x) => {
				if (!dataIds.includes(x.IDInvoice) && x.IDSaleOrder == null) {
					if (x.Id) {
						deletedFields.push(x.Id);
					} else {
						let groups = <FormArray>this.formGroup.controls.IncomingPaymentDetails;
						let index = groups.controls.findIndex((d) => d.value.IDInvoice == x.IDInvoice);
						groups.removeAt(index);
					}
				}
			});
			if (deletedFields.length && this.formGroup.controls.Id.value) {
				deletedFields.forEach((deletedId) => {
					let groups = <FormArray>this.formGroup.controls.IncomingPaymentDetails;
					let index = groups.controls.findIndex((d) => d.value.Id == deletedId);
					groups.removeAt(index);
				});
				this.removeField(deletedFields);
			}
			this.amountInvoice = data.Amount;
			if (this.formGroup.get('Amount').value <= 0) {
				this.formGroup.get('Amount').setValue(data.Amount + this.amountOrder);
				this.formGroup.get('Amount').markAsDirty();
			}
			if (this.formGroup.valid) {
				this.saveChange();
			}
		}
	}

	_contactDataSource = this.buildSelectDataSource((term) => {
		return this.contactProvider.search({
			SkipMCP: term ? false : true,
			SortBy: ['Id_desc'],
			Take: 20,
			Skip: 0,
			Keyword: term
		});
	});
	
	// {
	// 	searchProvider: this.contactProvider,
	// 	loading: false,
	// 	input$: new Subject<string>(),
	// 	selected: [],
	// 	items$: null,
	// 	id: this.id,
	// 	initSearch() {
	// 		this.loading = false;
	// 		this.items$ = concat(
	// 			of(this.selected),
	// 			this.input$.pipe(
	// 				distinctUntilChanged(),
	// 				tap(() => (this.loading = true)),
	// 				switchMap((term) =>
	// 					this.searchProvider
	// 						.search({
	// 							SkipMCP: term ? false : true,
	// 							SortBy: ['Id_desc'],
	// 							Take: 20,
	// 							Skip: 0,
	// 							Term: term ? term : 'BP:' + this.item?.IDCustomer,
	// 						})
	// 						.pipe(
	// 							catchError(() => of([])), // empty list on error
	// 							tap(() => (this.loading = false))
	// 						)
	// 				)
	// 			)
	// 		);
	// 	},
	// };
	
	
	_staffDataSource = this.buildSelectDataSource((term) => {
		return this.staffProvider.search({ Take: 20, Skip: 0, Keyword: term });
	});
	
	// {
	// 	searchProvider: this.staffProvider,
	// 	loading: false,
	// 	input$: new Subject<string>(),
	// 	selected: [],
	// 	items$: null,
	// 	initSearch() {
	// 		this.loading = false;
	// 		this.items$ = concat(
	// 			of(this.selected),
	// 			this.input$.pipe(
	// 				distinctUntilChanged(),
	// 				tap(() => (this.loading = true)),
	// 				switchMap((term) =>
	// 					this.searchProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
	// 						catchError(() => of([])), // empty list on error
	// 						tap(() => (this.loading = false))
	// 					)
	// 				)
	// 			)
	// 		);
	// 	},
	// };

	removeField(deletedFields) {
		this.formGroup.get('DeletedFields').setValue(deletedFields);
		this.formGroup.get('DeletedFields').markAsDirty();
	}

	async updateField(updatedField: any) {
		const index = this.incomingPaymentOrderDetails.findIndex((d) => d.Id === updatedField.IDIncomingPaymentDetail && updatedField.isEdit);
		if (index != -1) {
			this.incomingPaymentOrderDetails[index].Amount = updatedField.Amount;
			const group = <FormArray>this.formGroup.controls.IncomingPaymentDetails;
			group.at(index).get('Amount').setValue(updatedField.Amount);
			group.at(index).get('IDIncomingPayment').markAsDirty();
			group.at(index).get('Amount').markAsDirty();
		}
	}

	removeItem(index) {
		let groups = <FormArray>this.formGroup.controls.IncomingPaymentDetails;
		let id = groups.controls[index].value.Id;
		if (id != 0) {
			this.env.showPrompt('Bạn có chắc muốn xóa không?', null, 'Xóa 1 dòng').then((_) => {
				this.formGroup.get('DeletedFields').setValue([id]);
				this.formGroup.get('DeletedFields').markAsDirty();
				this.saveChange();
			});
		} else {
			groups.removeAt(index);
		}
	}

	IDCustomerChange() {
		if (this.item.Id != 0) {
			this.env
				.showPrompt('Khi thay đổi đổi khách hàng sẽ xóa toàn bộ hóa đơn trước đó', null, 'Bạn có muốn thay đổi không?')
				.then((_) => {
					this.formGroup.get('DeletedFields').setValue([this.formGroup.controls.IncomingPaymentDetails['Controls'].value.map((s) => s.Id)]);
					this.formGroup.get('DeletedFields').markAsDirty();
					this.saveChange();
				})
				.catch((_) => {
					this.formGroup.controls.IDCustomer.setValue(this.item.IDCustomer);
					this._contactDataSource.initSearch();
				});
		} else {
			this.formGroup.controls.IncomingPaymentDetails = new FormArray([]);
		}
	}

	segmentView = 's1';
	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
	}

	async saveChange() {
		this.saveChange2();
	}

	saveChange2(form = this.formGroup, publishEventCode = this.pageConfig.pageName, provider = this.pageProvider) {
		return new Promise((resolve, reject) => {
			this.formGroup.updateValueAndValidity();
			if (!form.valid) {
				this.env.showMessage('Please recheck information highlighted in red above', 'warning');
			} else if (this.submitAttempt == false) {
				this.submitAttempt = true;
				let submitItem = this.getDirtyValues(form);
				this.pageProvider.commonService
					.connect('POST', 'BANK/IncomingPayment/PostIncomingPayment', submitItem)
					.toPromise()
					.then((savedItem: any) => {
						resolve(savedItem);
						this.savedChange(savedItem, form);
						this.item = savedItem;
						let formArray = this.formGroup.get('IncomingPaymentDetails') as FormArray;
						formArray.clear();
						this.loadedData();
						if (publishEventCode) this.env.publishEvent({ Code: publishEventCode });
					})
					.catch((err) => {
						// this.env.showMessage('Cannot save, please try again', 'danger');
						this.cdr.detectChanges();
						this.submitAttempt = false;
						reject(err);
					});
			}
		});
	}
}
