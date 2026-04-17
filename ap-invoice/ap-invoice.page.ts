import { Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { AC_APInvoiceProvider, BANK_OutgoingPaymentProvider, WMS_ReceiptProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { FormBuilder, Validators } from '@angular/forms';
import { PURCHASE_OrderService } from '../../PURCHASE/purchase-order-service';
import { SearchAsyncPopoverPage } from '../../PURCHASE/search-async-popover/search-async-popover.page';
import { APInvoiceBKAVModalPage } from '../ap-invoice-bkav-modal/ap-invoice-bkav-modal.page';

@Component({
	selector: 'app-ap-invoice',
	templateUrl: 'ap-invoice.page.html',
	styleUrls: ['ap-invoice.page.scss'],
	standalone: false,
})
export class APInvoicePage extends PageBase {
	statusList = [];
	paymentStatusList = [];
	paymentTypeList = [];
	paymentReasonList = [];
	paymentSubTypeList = [];
	bkavFormGroup;

	constructor(
		public pageProvider: AC_APInvoiceProvider,
		public outgoingPaymentProvider: BANK_OutgoingPaymentProvider,
		public http: HttpClient,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public formBuilder: FormBuilder,
		public navCtrl: NavController,
		public location: Location,
		public purchaseOrderProvider: PURCHASE_OrderService,
		public receiptProvider: WMS_ReceiptProvider
	) {
		super();
		this.pageConfig.IsRequiredDateRangeToExport = true;
		this.formGroup = formBuilder.group({
			PaymentType: [''],
			PaymentSubType: [''],
			PaymentReason: [''],
		});
		const today = new Date().toISOString().slice(0, 10);
		this.bkavFormGroup = formBuilder.group({
			FromDate: [today, Validators.required],
			ToDate: [today, Validators.required],
		});
		this.pageConfig.ShowAdd = false;
		this.pageConfig.ShowAddNew = true;
	}

	preLoadData(event?: any): void {
		this.query.SortBy = 'Id_desc';
		Promise.all([
			this.env.getStatus('APInvoice'),
			this.env.getStatus('OutgoingPaymentStatus'),
			this.env.getType('PaymentType'),
			this.env.getType('OutgoingPaymentReasonType'),
		]).then((values) => {
			if (values[0]) {
				this.statusList = values[0];
			}
			if (values[1]) {
				this.paymentStatusList = values[1];
			}
			if (values[2]) {
				this.paymentTypeList = values[2].filter((d) => d.Code == 'Cash' || d.Code == 'Card' || d.Code == 'Transfer');
			}
			if (values[3]) {
				this.paymentReasonList = values[3];
				if (values[3].length == 0)
					this.paymentReasonList = [
						{ Name: 'Payment of invoice', Code: 'PaymentOfInvoice' },
						{ Name: 'Payment of purchase order', Code: 'PaymentOfPO' },
					];
			}
			super.preLoadData();
		});
	}

	loadedData(event) {
		this.items.forEach((i) => {
			i._Status = this.statusList.find((d) => d.Code == i.Status);
			if(this.pageConfig.ARIsShowBranch){
				i._Branch = this.env.branchList.find((b) => b.Id == i.IDBranch);
			}
		});
		super.loadedData(event);
	}

	ngOnDestroy() {
		this.dismissPopover();
	}

	@ViewChild('popoverPub') popoverPub;
	isOpenPopover = false;
	dismissPopover(apply: boolean = false) {
		if (!this.isOpenPopover || !this.IDBusinessPartner) {
			this.isOpenPopover = false;
			return;
		}
		if (apply) {
			this.submitAttempt = true;
			let obj = {
				Id: 0,
				IDBusinessPartner: this.IDBusinessPartner,
				IDBranch: this.env.selectedBranch,
				SourceType: 'Invoice',
				IDStaff: this.env.user.StaffID,
				Name: 'Pay for A/P invoice [' + this.selectedItems.map((d) => d.Id).join(',') + ']',
				Type: this.formGroup.get('PaymentType').value,
				SubType: this.formGroup.get('PaymentSubType').value,
				PaymentReason: this.formGroup.get('PaymentReason').value,
				PostingDate: new Date(),
				DueDate: new Date(),
				DocumentDate: new Date(),
				OutgoingPaymentDetails: this.selectedItems.map((d) => d.Id),
			};
			this.outgoingPaymentProvider.commonService
				.connect('POST', 'BANK/OutgoingPayment/PostFromSource', obj)
				.toPromise()
				.then((rs: any) => {
					this.env.showPrompt('Create outgoing payment successfully!', 'Do you want to navigate to outgoing payment ?').then((d) => {
						this.nav('Outgoing-Payment/' + rs.Id, 'forward');
					});
					console.log(rs);
				})
				.catch((err) => {
					this.env.showMessage(err.error?.Message ?? err, 'danger');
				})
				.finally(() => {
					this.submitAttempt = false;
				});

			// this.form.patchValue(this._reportConfig?.DataConfig);
		}
		this.isOpenPopover = false;
	}
	presentPopover(event = null) {
		this.isOpenPopover = true;
	}
	IDBusinessPartner;
	ShowRequestOutgoingPayment;
	changeSelection(i, e = null) {
		super.changeSelection(i, e);
		this.ShowRequestOutgoingPayment = false;
		if (this.pageConfig.canRequestOutgoingPayment) {
			this.ShowRequestOutgoingPayment = true;
		}
		const uniqueSellerIDs = new Set(this.selectedItems.map((i) => i.IDSeller));
		this.selectedItems?.forEach((i) => {
			let notShowRequestOutgoingPaymentAPStatus = ['Draft', 'Closed', 'Canceled'];
			let notShowRequestOutgoingPaymentPaymentStatus = ['Unapproved', 'Paid'];
			if (notShowRequestOutgoingPaymentAPStatus.indexOf(i.Status) != -1 || notShowRequestOutgoingPaymentPaymentStatus.indexOf(i.PaymentStatus) != -1) {
				this.ShowRequestOutgoingPayment = false;
				this.IDBusinessPartner = null;
			}
			if (uniqueSellerIDs.size > 1) {
				this.ShowRequestOutgoingPayment = false;
				this.IDBusinessPartner = null;
			} else {
				this.IDBusinessPartner = [...uniqueSellerIDs][0];
			}
		});
		if (this.selectedItems?.length == 0) {
			this.ShowRequestOutgoingPayment = false;
		}
	}

	isOpenAddNewPopover = false;
	@ViewChild('addNewPopover') addNewPopover!: HTMLIonPopoverElement;
	isOpenBKAVDatePopover = false;
	@ViewChild('bkavDatePopover') bkavDatePopover!: HTMLIonPopoverElement;
	presentAddNewPopover(e) {
		this.addNewPopover.event = e;
		this.isOpenAddNewPopover = !this.isOpenAddNewPopover;
	}

	openBKAVImportModal() {
		this.isOpenAddNewPopover = false;
		if (this.bkavDatePopover) this.bkavDatePopover.event = null;
		this.isOpenBKAVDatePopover = true;
	}

	dismissBKAVDatePopover(apply: boolean = false) {
		if (apply) {
			this.getBKAVDataAndOpenModal();
			return;
		}
		this.isOpenBKAVDatePopover = false;
	}

	// async getBKAVDataAndOpenModal() {
	// 	if (this.bkavFormGroup.invalid || this.submitAttempt) return;
	// 	this.submitAttempt = true;
	// 	this.env
	// 		.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'AC/APInvoice/BKAV/Preview', this.bkavFormGroup.value).toPromise())
	// 		.then(async (resp: any) => {
	// 			const invoices = resp || [];
	// 			if (!invoices.length) {
	// 				this.env.showMessage('No data available', 'warning');
	// 				return;
	// 			}
	// 			this.isOpenBKAVDatePopover = false;
	// 			const modal = await this.modalController.create({
	// 				component: APInvoiceBKAVModalPage,
	// 				componentProps: { invoices },
	// 				cssClass: 'modal90',
	// 			});
	// 			await modal.present();
	// 			const { role } = await modal.onWillDismiss();
	// 			if (role == 'imported') {
	// 				this.refresh();
	// 				this.env.publishEvent({ Code: this.pageConfig.pageName });
	// 			}
	// 		})
	// 		.catch((err) => {
	// 			this.env.showMessage(err.error?.Message || err.error || err.message || err, 'danger');
	// 		})
	// 		.finally(() => {
	// 			this.submitAttempt = false;
	// 		});
	// }
	async getBKAVDataAndOpenModal() {
		if (this.bkavFormGroup.invalid || this.submitAttempt) return;
		this.submitAttempt = true;
		try {
			const response: any = await this.http.get('assets/mock/ap-invoice-bkav-response.json').toPromise();
			const sourceInvoices = response?.data || [];
			const fromDate = this.toDateOnlyValue(this.bkavFormGroup.get('FromDate')?.value);
			const toDate = this.toDateOnlyValue(this.bkavFormGroup.get('ToDate')?.value);
			const filteredInvoices = sourceInvoices.filter((invoice) => this.isInvoiceInDateRange(invoice, fromDate, toDate));
			const invoices: any = await this.pageProvider.commonService.connect('POST', 'AC/APInvoice/BKAV/Preview', { Invoices: filteredInvoices }).toPromise();

			if (!invoices.length) {
				this.env.showMessage('No data available', 'warning');
				return;
			}

			this.isOpenBKAVDatePopover = false;
			await this.openBKAVModal(invoices);
		} catch (err) {
			this.env.showMessage(err?.error?.Message || err?.message || 'Can not load BKAV mock data', 'danger');
		} finally {
			this.submitAttempt = false;
		}
	}

	private isInvoiceInDateRange(invoice, fromDate, toDate) {
		const invoiceDate = this.toDateOnlyValue(invoice?.SignedDate || invoice?.InvoiceDate);
		if (!invoiceDate) return false;

		if (!fromDate || !toDate) return true;

		return invoiceDate >= fromDate && invoiceDate <= toDate;
	}

	private toDateOnlyValue(value) {
		if (!value) return null;

		if (value instanceof Date) {
			return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
		}

		if (typeof value === 'string') {
			const text = value.trim();
			const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
			if (isoMatch) {
				return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])).getTime();
			}

			const slashMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
			if (slashMatch) {
				return new Date(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1])).getTime();
			}
		}

		return null;
	}

	async openBKAVModal(invoices) {
		const modal = await this.modalController.create({
			component: APInvoiceBKAVModalPage,
			componentProps: { invoices },
			cssClass: 'modal90',
		});
		await modal.present();
		const { role } = await modal.onWillDismiss();
		if (role == 'added') {
			this.refresh();
			this.env.publishEvent({ Code: this.pageConfig.pageName });
		}
	}
	initPODatasource = [];
	initGRDatasource = [];

	async openPurchaseOrderPopover(ev: any = null) {
		let queryPO = {
			IDBranch: this.env.selectedBranchAndChildren,
			Take: 20,
			Skip: 0,
			Status: '["Approved"]',
		};
		let searchFn = this.buildSelectDataSource((term) => {
			return this.purchaseOrderProvider.search({ ...queryPO, Keyword: term });
		}, false);

		if (this.initPODatasource.length == 0) {
			this.purchaseOrderProvider.read(queryPO).then(async (rs: any) => {
				if (rs && rs.data) {
					this.initPODatasource = rs.data;
					searchFn.selected = this.initPODatasource;
					let popover = await this.popoverCtrl.create({
						component: SearchAsyncPopoverPage,
						componentProps: {
							title: 'Purchase order',
							type: 'PurchaseOrder',
							provider: this.purchaseOrderProvider,
							query: queryPO,
							searchFunction: searchFn,
						},
						event: ev,
						cssClass: 'w300',
						translucent: true,
					});
					popover.onDidDismiss().then((result: any) => {
						console.log(result);
						if (result.data) {
							this.copyFromPurchaseOrder(result.data.Id);
						}
					});
					return await popover.present();
				}
			});
		} else {
			searchFn.selected = this.initPODatasource;
			let popover = await this.popoverCtrl.create({
				component: SearchAsyncPopoverPage,
				componentProps: {
					title: 'Purchase order',
					type: 'PurchaseOrder',
					provider: this.purchaseOrderProvider,
					query: queryPO,
					searchFunction: searchFn,
				},
				event: ev,
				cssClass: 'w300',
				translucent: true,
			});
			popover.onDidDismiss().then((result: any) => {
				console.log(result);
				if (result.data) {
					this.copyFromPurchaseOrder(result.data.Id);
				}
			});
			return await popover.present();
		}
	}

	copyFromPurchaseOrder(id) {
		this.env.showLoading('Please wait for a few moments', this.purchaseOrderProvider.getAnItem(id, null)).then((item) => {
			this.purchaseOrderProvider
				.createInvoice(item, this.env, this.pageConfig)
				.then((resp: any) => {
					this.env.showMessage('APInvoice created!', 'success');

					this.refresh();
					this.env.publishEvent({ Code: this.pageConfig.pageName });
				})
				.catch((err) => this.env.showMessage(err));
		});
	}

	async openGoodsReceiptPopover(ev: any = null) {
		let queryGR = {
			IDBranch: this.env.selectedBranchAndChildren,
			Take: 20,
			Skip: 0,
			Status: '["Received"]',
		};
		let searchFn = this.buildSelectDataSource((term) => {
			return this.receiptProvider.search({ ...queryGR, Keyword: term });
		}, false);

		if (this.initGRDatasource.length == 0) {
			this.receiptProvider.read(queryGR).then(async (rs: any) => {
				if (rs && rs.data) {
					this.initGRDatasource = rs.data;
					searchFn.selected = this.initGRDatasource;
					let popover = await this.popoverCtrl.create({
						component: SearchAsyncPopoverPage,
						componentProps: {
							title: 'Goods receipt',
							type: 'Receipt',
							provider: this.receiptProvider,
							query: queryGR,
							searchFunction: searchFn,
						},
						event: ev,
						cssClass: 'w300',
						translucent: true,
					});
					popover.onDidDismiss().then((result: any) => {
						console.log(result);
						if (result.data) {
							this.copyFromGoodsReceipt(result.data.Id);
						}
					});
					return await popover.present();
				}
			});
		} else {
			searchFn.selected = this.initGRDatasource;
			let popover = await this.popoverCtrl.create({
				component: SearchAsyncPopoverPage,
				componentProps: {
					title: 'Goods receipt',
					type: 'Receipt',
					provider: this.receiptProvider,
					query: queryGR,
					searchFunction: searchFn,
				},
				event: ev,
				cssClass: 'w300',
				translucent: true,
			});
			popover.onDidDismiss().then((result: any) => {
				console.log(result);
				if (result.data) {
					this.copyFromGoodsReceipt(result.data.Id);
				}
			});
			return await popover.present();
		}
	}

	copyFromGoodsReceipt(id) {
		this.env.showLoading('Please wait for a few moments', this.receiptProvider.getAnItem(id, null)).then((item: any) => {
			this.receiptProvider.commonService
				.connect('POST', 'WMS/Receipt/CreateInvoice/', {
					Ids: [item.Id],
				})
				.toPromise()
				.then((rs) => {
					this.env.showMessage('APInvoice created!', 'success');

					this.refresh();
					this.env.publishEvent({ Code: this.pageConfig.pageName });
				})
				.catch((err) => this.env.showMessage(err));
		});
	}
}

