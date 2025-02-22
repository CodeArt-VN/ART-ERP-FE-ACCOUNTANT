import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
	BANK_AccountProvider,
	BANK_IncomingPaymentProvider,
	BANK_OutgoingPaymentProvider,
	BANK_TransactionProvider,
	BRA_BranchProvider,
	CRM_ContactProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { Subject, catchError, concat, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { IncomingPaymentSaleOrderModalPage } from '../incoming-payment-sale-order-modal/incoming-payment-sale-order-modal.page';
import { IncomingPaymentInvoiceModalPage } from '../incoming-payment-invoice-modal/incoming-payment-invoice-modal.page';
import { OutgoingPaymentPurchaseOrderModalPage } from '../outgoing-payment-purchase-order-modal/outgoing-payment-purchase-order-modal.page';
import { OutgoingPaymentInvoiceModalPage } from '../outgoing-payment-invoice-modal/outgoing-payment-invoice-modal.page';

@Component({
	selector: 'app-bank-transaction-detail',
	templateUrl: './bank-transaction-detail.page.html',
	styleUrls: ['./bank-transaction-detail.page.scss'],
	standalone: false,
})
export class BankTransactionDetailPage extends PageBase {
	reconciliationStatusList;
	statusList;
	branchList;
	accountList;
	SelectedOrderList: any;
	SelectedInvoiceList: any;
	canDeletePaymentDetail = false;
	defaultBusinessPartner;
	invoicePaymentCount = 0;
	orderPaymentCount = 0;
	differenceAmount = 0;
	constructor(
		public pageProvider: BANK_TransactionProvider,
		public incomingPaymentProvider: BANK_IncomingPaymentProvider,
		public outgoingPaymentProvider: BANK_OutgoingPaymentProvider,
		public bankAccountProvider: BANK_AccountProvider,
		public branchProvider: BRA_BranchProvider,
		public contactProvider: CRM_ContactProvider,
		public modalController: ModalController,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
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
			IDBusinessPartner: [''],
			IDAccount: [''],
			ReferenceNumber: [''],
			Amount: ['', Validators.required],
			TransactionDate: [''],
			ReciprocalAccount: [''],
			Currency: [''],
			TransactionStatus: [''],
			ReconciliationStatus: new FormControl({ value: '', disabled: true }),
			Remark: [''],
			ReciprocalName: [''],
			PaymentDetails: formBuilder.array([]),
			_IDBusinessPartner: [''], //retain original value
			Sort: [''],
			IsDisabled: new FormControl({ value: '', disabled: true }),
			IsDeleted: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),
		});
	}
	_contactDataSource = {
		searchProvider: this.contactProvider,
		loading: false,
		input$: new Subject<string>(),
		selected: [],
		items$: null,
		id: this.id,

		initSearch() {
			// Load selected items initially, but don't reset them on subsequent searches
			this.items$ = of(this.selected).pipe(
				switchMap((selectedItems) =>
					concat(
						of(selectedItems),
						this.input$.pipe(
							distinctUntilChanged(),
							tap(() => (this.loading = true)),
							switchMap((term) =>
								this.searchProvider
									.search({
										SkipMCP: term ? false : true,
										SortBy: ['Id_desc'],
										Take: 20,
										Skip: 0,
										Term: term ? term : 'BP:' + this.item?.IDBusinessPartner,
									})
									.pipe(
										catchError(() => of([])),
										map((searchResults: any) => {
											// Combine selected items with search results, ensuring no duplicates
											return [...this.selected, ...searchResults.filter((item) => !this.selected.some((selectedItem) => selectedItem.Id === item.Id))];
										}), // empty list on error
										tap(() => (this.loading = false))
									)
							)
						)
					)
				)
			);
		},
	};
	// #region load
	preLoadData(event?: any): void {
		this.selectedItems = [];
		this.reconciliationStatusList = [
			{ Code: 'Unrecognized', Name: 'Unrecognized', Color: 'warning' },
			{ Code: 'Suggested', Name: 'Suggested entry', Color: 'secondary' },
			{ Code: 'RecordFound', Name: 'Record found', Color: 'success' },
		];
		Promise.all([
			this.env.getStatus('PaymentStatus'),
			this.branchProvider.read({ Skip: 0, Take: 5000, AllParent: true, Id: this.env.selectedBranchAndChildren }),
			this.bankAccountProvider.read({ Skip: 0, Take: 5000, AllParent: true }),
		]).then((values: any) => {
			this.statusList = values[0];
			lib.buildFlatTree(values[1]['data'], this.branchList)
				.then((result: any) => {
					this.branchList = result;
					this.branchList.forEach((i) => {
						i.disabled = true;
					});
					this.markNestedNode(this.branchList, this.env.selectedBranch);
					lib.buildFlatTree(values[2]['data'], this.accountList).then((result: any) => {
						this.accountList = result;
					});
					super.preLoadData(event);
				})
				.catch((err) => {
					this.env.showMessage(err);
				});
		});
	}
	loadedData(event) {
		super.loadedData(event);
		let groups = <FormArray>this.formGroup.controls.PaymentDetails;
		groups.clear();
		groups.valueChanges.subscribe((value) => {
			this.invoicePaymentCount = groups.value.filter((d) => d.Invoice).length;
			this.orderPaymentCount = groups.value.filter((d) => d.IDOrder).length;
			this.calcDifferenceAmount();
		});
		this.item.PaymentDetails?.forEach((i) => {
			this.addField(i);
		});
		if (this.formGroup.get('TransactionStatus').value == 'Success') {
			this.formGroup.get('Amount').disable();
			this.formGroup.get('TransactionDate').disable();
			this.formGroup.get('Remark').disable();
			this.formGroup.get('TransactionStatus').disable();
			this.formGroup.get('Currency').disable();
			this.formGroup.get('ReciprocalAccount').disable();
			this.formGroup.get('ReciprocalName').disable();
		}
		if (this.pageConfig.canEdit) this.canDeletePaymentDetail = true;
		if (this.item.BusinessPartner) this._contactDataSource.selected = [this.item.BusinessPartner];
		this._contactDataSource.initSearch();
		this.formGroup.get('_IDBusinessPartner').setValue(this.item.IDBusinessPartner);
		if (this.formGroup.get('ReconciliationStatus').value == 'RecordFound' || this.item.PaymentDetails?.some((i) => i.Id)) {
			this.formGroup.get('PaymentDetails').disable();
			this.canDeletePaymentDetail = false;
		}
	}
	// #endregion

	addField(field: any, markAsDirty = false) {
		let groups = <FormArray>this.formGroup.controls.PaymentDetails;
		let group = this.formBuilder.group({
			Id: [field?.Id],
			IDPayment: [field?.IDPayment],
			IDOrder: [field?.IDOrder],
			Name: [field?.Name],
			IDBusinessPartner: [field?.IDBusinessPartner],
			IDInvoice: [field?.IDInvoice],
			Amount: [field?.Amount],
			Remark: [field?.Remark],
		});
		groups.push(group);
	}
	changeBP(event) {
		let groups = <FormArray>this.formGroup.controls.PaymentDetails;
		if (groups.controls.length > 0) {
			this.env
				.showPrompt('Thay đổi Contact sẽ mất thông tin đơn hàng và hoá đơn, bạn có muốn tiếp tục', null, 'Thay đổi')
				.then((_) => {
					groups.clear();
					this.formGroup.get('_IDBusinessPartner').setValue(this.formGroup.get('IDBusinessPartner').value);
					this.saveChange();
					if (this.item.PaymentIds?.some((i) => i > 0)) {
						let itemsDelete = this.item.PaymentIds.filter((i) => i > 0).map((item) => ({ Id: item }));
						this.incomingPaymentProvider
							.delete(itemsDelete)
							.then((result) => {
								this.item.PaymentIds = [];
							})
							.catch((err) => {
								this.env.showMessage('Cannot delete', 'danger');
							});
					}
				})
				.catch((err) => {
					this.formGroup.get('IDBusinessPartner').setValue(this.formGroup.get('_IDBusinessPartner').value);
					this._contactDataSource.selected.push(event);
					this.formGroup.get('IDBusinessPartner').markAsPristine();
				});
		} else this.saveChange();
	}
	changeTransactionStatus() {
		this.saveChange();
		if (this.formGroup.get('TransactionStatus').value == 'Success') {
			this.formGroup.get('TransactionStatus').disable();
			this.formGroup.get('Currency').disable();
			this.canDeletePaymentDetail = true;
		}
	}

	CreatePayment() {
		let total = parseFloat(
			this.formGroup.controls.PaymentDetails.value.reduce((sum, i) => {
				return (sum += i.Amount || 0);
			}, 0)
		);
		if (this.formGroup.get('Amount').value < 0 && total != Math.abs(this.formGroup.get('Amount').value)) {
			this.env.showMessage('Amount of transaction and total amount of payment details are not match!', 'danger');
			return;
		}
		if (this.formGroup.controls.Amount.value > 0) {
			let incomingPaymentDetails = this.formGroup.get('PaymentDetails').value;
			incomingPaymentDetails.forEach((i) => {
				i.IDSaleOrder = i.IDOrder;
			});
			let incomingPayment = {
				IDBranch: this.formGroup.get('IDBranch').value,
				IDCustomer: this.formGroup.get('IDBusinessPartner').value,
				IDTransaction: this.formGroup.get('Id').value,
				Amount: this.formGroup.get('Amount').value,
				Status: this.formGroup.get('TransactionStatus').value,
				PostingDate: new Date(),
				DocumentDate: this.formGroup.get('TransactionDate').value,
				DueDate: this.formGroup.get('TransactionDate').value,
				IncomingPaymentDetails: incomingPaymentDetails,
			};
			this.incomingPaymentProvider.commonService
				.connect('POST', 'BANK/IncomingPayment/PostIncomingPayment', incomingPayment)
				.toPromise()
				.then((savedItem: any) => {
					if (savedItem) {
						this.formGroup.get('ReconciliationStatus').setValue('RecordFound');
						this.formGroup.get('ReconciliationStatus').markAsDirty();
						this.saveChange();
						this.items.PaymentIds ? this.items.PaymentIds.push(savedItem.Id) : (this.items.PaymentIds = [savedItem.Id]);
					}
				})
				.catch((err) => {
					this.env.showMessage('Cannot save, please try again', 'danger');
					this.cdr.detectChanges();
					this.submitAttempt = false;
				});
		} else {
			let outgoingPaymentDetails = this.formGroup.get('PaymentDetails').value;
			outgoingPaymentDetails.forEach((i) => {
				i.DocumentEntry = i.IDOrder > 0 ? i.IDOrder : i.IDInvoice;
				i.DocumentType = i.IDOrder > 0 ? 'Order' : 'Invoice';
			});
			let outgoingPayment = {
				IDBranch: this.formGroup.get('IDBranch').value,
				IDBusinessPartner: this.formGroup.get('IDBusinessPartner').value,
				IDTransaction: this.formGroup.get('Id').value,
				Amount: total,
				Status: 'Paid',
				PostingDate: new Date(),
				DocumentDate: this.formGroup.get('TransactionDate').value,
				DueDate: this.formGroup.get('TransactionDate').value,
				OutgoingPaymentDetails: outgoingPaymentDetails,
			};
			this.outgoingPaymentProvider
				.save(outgoingPayment)
				.then((savedItem: any) => {
					if (savedItem) {
						this.formGroup.get('ReconciliationStatus').setValue('RecordFound');
						this.formGroup.get('ReconciliationStatus').markAsDirty();
						this.saveChange();
						this.items.PaymentIds ? this.items.PaymentIds.push(savedItem.Id) : (this.items.PaymentIds = [savedItem.Id]);
					}
					console.log(savedItem);
				})
				.catch((err) => {
					this.env.showMessage('Cannot save, please try again', 'danger');
					this.cdr.detectChanges();
					this.submitAttempt = false;
				});
		}
	}
	removeItem(fg) {
		let groups = <FormArray>this.formGroup.controls.PaymentDetails;
		const index = groups.controls.findIndex((group) => group.get('IDInvoice').value === fg.get('IDInvoice').value && group.get('IDOrder').value === fg.get('IDOrder').value);
		groups.removeAt(index);
	}
	amountOrder = 0;
	amountInvoice = 0;
	paymentDetails: any;
	async showSaleOrderModal() {
		this.paymentDetails = [...this.formGroup.controls.PaymentDetails.value.filter((d) => d.IDOrder)];
		this.SelectedOrderList = [...this.paymentDetails];
		const modal = await this.modalController.create({
			component: IncomingPaymentSaleOrderModalPage,
			componentProps: {
				IDContact: this.formGroup.controls.IDBusinessPartner.value,
				IDBusinessPartner: this.formGroup.controls.IDBusinessPartner.value,
				//amount: this.amountOrder,
				amount: this.formGroup.get('Amount').value,
				SelectedOrderList: this.SelectedOrderList,
				canEdit: this.pageConfig.canEdit,
				canEditAmount: false,
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
			let dataFormatted = data.map((d) => ({
				Id: d.Id,
				Amount: d.Amount,
				IDOrder: d.IDSaleOrder ?? d.IDOrder,
				Name: d.Name,
				IDCustomer: d.IDCustomer,
				IDBusinessPartner: d.IDBusinessPartner,
				IDInvoice: null,
				Remark: d.Remark,
			}));
			for (let i = 0; i < dataFormatted.length; i++) {
				const e = dataFormatted[i];
				this.SelectedOrderList.push(e);
				if (!this.paymentDetails.some((item) => item.IDOrder === e.IDOrder)) {
					this.addField(e, true);
				} else {
					this.updateField(e);
				}
				dataIds = data.map((e) => e.IDOrder);
			}
			this.paymentDetails.forEach((x) => {
				if (!dataIds.includes(x.IDOrder) && x.IDInvoice == null) {
					if (x.Id) {
						deletedFields.push(x.Id);
					} else {
						let groups = <FormArray>this.formGroup.controls.PaymentDetails;
						let index = groups.controls.findIndex((d) => d.value.IDOrder == x.IDOrder);
						groups.removeAt(index);
					}
				}
			});
			if (deletedFields.length && this.formGroup.controls.Id.value) {
				deletedFields.forEach((deletedId) => {
					let groups = <FormArray>this.formGroup.controls.PaymentDetails;
					let index = groups.controls.findIndex((d) => d.value.Id == deletedId);
					groups.removeAt(index);
				});
			}
			this.amountOrder = data.reduce((sum, item) => {
				return (sum += item.Amount || 0);
			}, 0);
			// if (this.formGroup.get('Amount').value <= 0) {
			//   this.formGroup.get('Amount').setValue(data.Amount + this.amountInvoice);
			//   this.formGroup.get('Amount').markAsDirty();
			// }
		}
	}

	async showARInvoiceModal() {
		this.paymentDetails = [...this.formGroup.controls.PaymentDetails.value.filter((d) => d.IDInvoice)];
		this.SelectedInvoiceList = [...this.paymentDetails];
		const modal = await this.modalController.create({
			component: IncomingPaymentInvoiceModalPage,
			componentProps: {
				IDBusinessPartner: this.formGroup.controls.IDBusinessPartner.value,
				//amount: this.amountInvoice,
				amount: this.formGroup.get('Amount').value,
				SelectedInvoiceList: this.SelectedInvoiceList,
				amountOrder: this.amountOrder,
				canEditAmount: false,
			},
			cssClass: 'modal90',
		});

		await modal.present();
		const { data } = await modal.onWillDismiss();
		this.SelectedInvoiceList = [];
		if (data && data.length) {
			let deletedFields = [];
			let dataIds = [];
			let dataFormatted = data.map((d) => ({
				Id: d.Id,
				Amount: d.Amount,
				IDOrder: null,
				IDBusinessPartner: d.IDCustomer,
				Name: d.Name,
				IDInvoice: d.IDInvoice,
				Remark: d.Remark,
			}));
			for (let i = 0; i < dataFormatted.length; i++) {
				const e = dataFormatted[i];
				this.SelectedInvoiceList.push(e);
				e.IDOrder = null;
				if (!this.paymentDetails.some((item) => item.IDInvoice === e.IDInvoice)) {
					this.addField(e, true);
				} else {
					this.updateField(e);
				}
				dataIds = data.map((e) => e.IDInvoice);
			}
			this.paymentDetails.forEach((x) => {
				if (!dataIds.includes(x.IDInvoice) && x.IDOrder == null) {
					let groups = <FormArray>this.formGroup.controls.PaymentDetails;
					let index = groups.controls.findIndex((d) => d.value.IDInvoice == x.IDInvoice);
					groups.removeAt(index);
				}
			});
			this.amountInvoice = data.reduce((sum, item) => {
				return (sum += item.Amount || 0);
			}, 0);
			// if (this.formGroup.get('Amount').value <= 0) {
			//   this.formGroup.get('Amount').setValue(data.Amount + this.amountOrder);
			//   this.formGroup.get('Amount').markAsDirty();
			// }
		}
	}
	async showPurchaseOrderModal() {
		this.paymentDetails = [...this.formGroup.controls.PaymentDetails.value];
		this.paymentDetails.forEach((s) => (s.DocumentEntry = s.IDOrder));
		this.SelectedOrderList = [...this.paymentDetails.filter((d) => d.IDOrder)];
		// let amountInvoice = parseFloat(this.formGroup.controls.PaymentDetails.value.filter(d=>d.IDInvoice).reduce((sum,i)=>{
		//   return sum += (i.Amount||0);
		// },0))
		let amountOrder = -this.formGroup.controls.Amount.value - this.amountInvoice;
		const modal = await this.modalController.create({
			component: OutgoingPaymentPurchaseOrderModalPage,
			componentProps: {
				IDBusinessPartner: this.formGroup.controls.IDBusinessPartner.value,
				DefaultBusinessPartner: this.defaultBusinessPartner,
				//amount: this.amountOrder,
				canEdit: this.pageConfig.canEdit,
				amount: amountOrder,
				//IDOutgoingPayment: this.formGroup.controls.Id.value,
				SelectedOrderList: this.SelectedOrderList,
				canEditAmount: false,
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
				if (!this.paymentDetails.some((item) => item.IDOrder == e.IDOrder)) {
					this.addField(e, true);
				} else {
					if (e.Amount != this.paymentDetails.find((item) => item.IDOrder == e.IDOrder).Amount) {
						this.updateField(e);
					}
				}
				dataIds = data.map((e) => e.IDOrder);
			}
			this.paymentDetails.forEach((x) => {
				if (!dataIds.includes(x.IDOrder)) {
					if (x.Id) {
						deletedFields.push(x.Id);
					} else {
						let groups = <FormArray>this.formGroup.controls.OutgoingPaymentDetails;
						let index = groups.controls.findIndex((d) => d.value.IDOrder == x.IDOrder);
						groups.removeAt(index);
					}
				}
			});
			if (deletedFields.length && this.formGroup.controls.Id.value) {
				deletedFields.forEach((deletedId) => {
					let groups = <FormArray>this.formGroup.controls.OutgoingPaymentDetails;
					let index = groups.controls.findIndex((d) => d.value.Id == deletedId);
					groups.removeAt(index);
				});
			}
			this.amountOrder = data.Amount;
		}
	}
	async showAPInvoiceModal() {
		this.paymentDetails = [...this.formGroup.controls.PaymentDetails.value];
		this.paymentDetails.forEach((s) => (s.DocumentEntry = s.IDInvoice));
		this.SelectedInvoiceList = [...this.paymentDetails.filter((d) => d.IDInvoice)];
		let amountInvoice = -this.formGroup.controls.Amount.value - this.amountOrder;
		const modal = await this.modalController.create({
			component: OutgoingPaymentInvoiceModalPage,
			componentProps: {
				IDBusinessPartner: this.formGroup.controls.IDBusinessPartner.value,
				canEdit: this.pageConfig.canEdit,
				DefaultBusinessPartner: this.defaultBusinessPartner,
				//amount: this.amountInvoice,
				// IDOutgoingPayment: this.formGroup.controls.Id.value,
				canEditAmount: false,
				amount: amountInvoice,
				SelectedInvoiceList: this.SelectedInvoiceList,
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
				e.IDBusinessPartner = e.IDSeller;
				this.SelectedInvoiceList.push(e);
				e.IDOrder = null;
				if (!this.paymentDetails.some((item) => item.IDInvoice == e.IDInvoice)) {
					this.addField(e, true);
				} else {
					if (e.Amount != this.paymentDetails.find((item) => item.IDInvoice == e.IDInvoice).Amount) {
						this.updateField(e);
					}
				}
				dataIds = data.map((e) => e.IDInvoice);
			}
			this.paymentDetails.forEach((x) => {
				if (!dataIds.includes(x.IDInvoice)) {
					if (x.Id) {
						deletedFields.push(x.Id);
					} else {
						let groups = <FormArray>this.formGroup.controls.PaymentDetails;
						let index = groups.controls.findIndex((d) => d.value.IDInvoice == x.IDInvoice);
						groups.removeAt(index);
					}
				}
			});
			if (deletedFields.length && this.formGroup.controls.Id.value) {
				deletedFields.forEach((deletedId) => {
					let groups = <FormArray>this.formGroup.controls.PaymentDetails;
					let index = groups.controls.findIndex((d) => d.value.Id == deletedId);
					groups.removeAt(index);
				});
			}
		}
	}

	FindMatchingCriteria() {
		let obj = { Ids: [this.formGroup.get('Id').value] };
		this.commonService
			.connect('PUT', 'BANK/Transaction/FindMatchingCriteria', obj)
			.toPromise()
			.then((res) => {
				if (res) this.env.showMessage('saved', 'success');
				this.submitAttempt = false;
			})
			.catch((err) => {
				this.env.showMessage(err, 'danger');
				this.submitAttempt = false;
			})
			.finally(() => {
				super.loadedData(event);
				this.submitAttempt = false;
			});
	}

	async updateField(updatedField: any) {
		const index = this.paymentDetails.findIndex((d) => d.IDInvoice === updatedField.IDInvoice && d.IDOrder == updatedField.IDOrder);
		if (index != -1) {
			this.paymentDetails[index].Amount = updatedField.Amount;
			const group = <FormArray>this.formGroup.controls.PaymentDetails;
			group.at(index).get('Amount').setValue(updatedField.Amount);
			// const group = <FormArray>this.formGroup.controls.PaymentDetails;
			// group.at(index).get('Amount').setValue(updatedField.Amount);
			// group.at(index).get('IDIncomingPayment').markAsDirty();
			// group.at(index).get('Amount').markAsDirty();
		}
	}

	//#region sort
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
		const PaymentDetailsArray = this.formGroup.get('PaymentDetails') as FormArray;
		this.item.PaymentDetails = PaymentDetailsArray.getRawValue();
		for (const key in this.sortDetail) {
			if (this.sortDetail.hasOwnProperty(key)) {
				const value = this.sortDetail[key];
				this.sortByKey(value);
			}
		}
		PaymentDetailsArray.clear();
		this.item.PaymentDetails.forEach((s) => this.addField(s));
	}
	sortByKey(key: string, desc: boolean = false) {
		if (key.includes('_desc')) {
			key = key.replace('_desc', '');
			desc = true;
		}
		this.item.PaymentDetails.sort((a, b) => {
			const comparison = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
			return desc ? -comparison : comparison;
		});
	}

	//#endregion

	segmentView = 's1';
	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
	}

	async saveChange() {
		super.saveChange2();
	}

	markNestedNode(ls, Id) {
		ls.filter((d) => d.IDParent == Id).forEach((i) => {
			if (i.Type != 'TitlePosition') i.disabled = false;
			this.markNestedNode(ls, i.Id);
		});
	}

	calcDifferenceAmount() {
		this.amountOrder = parseFloat(
			this.formGroup
				.get('PaymentDetails')
				.value.filter((d) => d.IDOrder)
				.reduce((sum, item) => sum + (item.Amount || 0), 0)
		);
		this.amountInvoice = parseFloat(
			this.formGroup
				.get('PaymentDetails')
				.value.filter((d) => d.IDInvoice)
				.reduce((sum, item) => sum + (item.Amount || 0), 0)
		);
		this.orderPaymentCount = this.formGroup.get('PaymentDetails').value.filter((d) => d.IDOrder).length;
		this.invoicePaymentCount = this.formGroup.get('PaymentDetails').value.filter((d) => d.IDInvoice).length;
		this.differenceAmount = Math.abs(this.formGroup.get('Amount').value) - (this.amountOrder + this.amountInvoice);
	}
}
