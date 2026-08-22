import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, SALE_OrderProvider, AC_ARInvoiceProvider, CRM_ContactProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';

import { ARInvoiceSplitModalPage } from '../arinvoice-split-modal/arinvoice-split-modal.page';
import { ARInvoiceMergeModalPage } from '../arinvoice-merge-modal/arinvoice-merge-modal.page';
import { EInvoiceService } from 'src/app/services/custom/einvoice.service';
import { lib } from 'src/app/services/static/global-functions';
import { SortConfig } from 'src/app/interfaces/options-interface';
import { SYS_ConfigService } from 'src/app/services/custom/system-config.service';

@Component({
	selector: 'app-arinvoice',
	templateUrl: './ar-invoice.page.html',
	styleUrls: ['./ar-invoice.page.scss'],
	standalone: false,
})
export class ARInvoicePage extends PageBase {
	statusList = [];

	constructor(
		public pageProvider: AC_ARInvoiceProvider,
		public branchProvider: BRA_BranchProvider,
		public orderProvider: SALE_OrderProvider,
		public contactProvider: CRM_ContactProvider,
		public EInvoiceService: EInvoiceService,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public sysConfigService: SYS_ConfigService,
		public navCtrl: NavController,

		public location: Location
	) {
		super();

		// this.pageConfig.isShowFeature = true;
		this.pageConfig.isShowSearch = false;
		this.pageConfig.IsRequiredDateRangeToExport = true;

		this.pageConfig.dividers = [
			{
				fields: ['InvoiceDate'],
				dividerFn: (record, recordIndex, records) => {
					const a = recordIndex == 0 ? new Date('2000-01-01') : new Date(records[recordIndex - 1].InvoiceDate);
					const b = new Date(record.InvoiceDate);
					const sameDay =
						a.getDate() == b.getDate() && a.getMonth() == b.getMonth() && a.getFullYear() == b.getFullYear();
					if (sameDay) {
						return null;
					}
					return lib.dateFormat(record.InvoiceDate, 'dd/mm/yyyy');
				},
			},
		];
	}

	preLoadData(event) {
		//this.query.Status = "['ARInvoiceApproved','ARInvoiceRejected','ARInvoicePending']";
		
		this.query.InvoiceDateTimeFrame = {
			From: { Type: 'Relative', IsPastDate: true, Period: 'Week', Amount: 1, IsNull: false },
			To: { Type: 'Relative', IsPastDate: true, Period: 'Day', Amount: 0, IsNull: false },
		};
		
		let sorted: SortConfig[] = [
			{ Dimension: 'InvoiceDate', Order: 'DESC' },
			{ Dimension: 'IDBranch', Order: 'DESC' },
			{ Dimension: 'IDSaleOrder', Order: 'DESC' },
		];
		this.pageConfig.sort = sorted;
		this.query.IDOwner = this.pageConfig.canViewAllData ? 'all' : this.env.user.StaffID;

		Promise.all([
			this.env.getStatus('ARInvoiceStatus'),
			this.sysConfigService.getConfig(this.env.selectedBranch, ['ARIsShowSOCode', 'ARIsShowBillNo','ARIsShowBranch'])
		]).then((values: any) => {
			this.statusList = values[0];
			this.statusList.unshift({
				Code: "['ARInvoiceApproved','ARInvoiceRejected','ARInvoicePending']",
				Name: 'Cần xem',
			});
			this.statusList.unshift({ Code: '', Name: 'All' });
			if(values[1]){
				this.pageConfig = {
					...this.pageConfig,
					...values[1]
				};
			}
			
			super.preLoadData(event);
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

	
	createEInvoice() {
		if (!this.pageConfig.canCreateEInvoice) {
			return;
		}

		let itemsCanNotProcess = this.selectedItems.filter((i) => i.Status != 'ARInvoiceApproved');
		if (itemsCanNotProcess.length == this.selectedItems.length) {
			this.env.showMessage('Cannot generate e-invoice. Please only select approved order', 'warning');
		} else {
			itemsCanNotProcess.forEach((i) => {
				i.checked = false;
			});
			this.selectedItems = this.selectedItems.filter((i) => i.Status == 'ARInvoiceApproved');
			this.showCreateEInvoicePopup();
		}
	}

	updateEInvoice() {
		if (this.submitAttempt) return;

		this.selectedItems = this.selectedItems.filter((i) => i.Status == 'EInvoiceNew');
		if (!this.selectedItems.length) {
			this.env.showMessage('Please choose the invoice for updating the data');
			return;
		}
		this.submitAttempt = true;

		this.env
			.showLoading('Please wait for a few moments', this.EInvoiceService.UpdateEInvoice(this.selectedItems.map((i) => i.Id)).toPromise())
			.then((resp: any) => {
				this.submitAttempt = false;
				this.env.showMessage('Sucessfully updated the e-invoice', 'success');
				this.refresh();
			})
			.catch((err) => {
				if (err?.error?.ExceptionMessage) {
					this.env.showMessage(err.error.ExceptionMessage, 'danger');
				} else if (err.message) {
					this.env.showMessage(err.message, 'danger');
				} else {
					this.env.showMessage('Update failed. Please try again later', 'danger');
				}

				this.submitAttempt = false;
			});
	}

	signARInvoice() {
		if (this.submitAttempt) return;
		this.selectedItems = this.selectedItems.filter((i) => i.Status == 'EInvoiceNew');
		if (!this.selectedItems.length) {
			this.env.showMessage('Please choose the invoice for signing');
			return;
		}
		this.submitAttempt = true;

		this.env
			.showLoading('Please wait for a few moments', this.EInvoiceService.SignEInvoice(this.selectedItems.map((i) => i.Id)).toPromise())
			.then((resp: any) => {
				this.submitAttempt = false;
				this.refresh();
			})
			.catch((err) => {
				console.log(err);
				this.submitAttempt = false;
			});
	}

	syncEInvoice() {
		if (this.submitAttempt) return;

		this.selectedItems = this.selectedItems.filter((i) => i.Status == 'EInvoiceNew');
		if (!this.selectedItems.length) {
			this.env.showMessage('Please choose the invoice for Synchronizing');
			return;
		}
		this.submitAttempt = true;

		this.env
			.showLoading('Please wait for a few moments', this.EInvoiceService.SyncEInvoice(this.selectedItems.map((i) => i.Id)).toPromise())
			.then((resp: any) => {
				this.submitAttempt = false;
				this.refresh();
			})
			.catch((err) => {
				console.log(err);
				this.submitAttempt = false;
			});
	}

	showCreateEInvoicePopup() {
		this.alertCtrl
			.create({
				header: 'Xuất hóa đơn điện tử',
				//subHeader: '---',
				message: 'Bạn có chắc muốn xuất hóa đơn điện tử cho các hóa đơn này?',
				buttons: [
					{
						text: 'Không',
						role: 'cancel',
						handler: () => {},
					},
					{
						text: 'Có',
						cssClass: 'success-btn',
						handler: () => {
							this.loadingController
								.create({
									cssClass: 'my-custom-class',
									message: 'Vui lòng chờ cấp số hóa đơn...',
								})
								.then((loading) => {
									loading.present();
									this.EInvoiceService.CreateEInvoice(this.selectedItems.map((i) => i.Id))
										.toPromise()
										.then((resp: any) => {
											this.selectedItems = [];
											if (loading) loading.dismiss();
											this.submitAttempt = false;

											let errors = resp.filter((d) => d.Status == 1);
											let message = '';

											for (let i = 0; i < errors.length && i <= 5; i++)
												if (i == 5) message += '<br> Còn nữa...';
												else {
													const e = errors[i];
													message += '<br> #' + e.PartnerInvoiceID + ' lỗi: ' + e.MessLog;
												}
											if (message != '') {
												this.env.showAlert(
													message,
													{ code: 'There are {value} invoice(s) with errors. Please check the notes of the unapproved invoices', value: errors.length },
													'Issue the invoice'
												);
												this.refresh();
											} else {
												this.env.showMessage('Issued the e-invoice', 'success');
												this.submitAttempt = false;
												this.refresh();
											}
										})
										.catch((err: any) => {
											this.env.showMessage('Unable to issue invoice. Please check again!' + '\n' + (err?.error?.ExceptionMessage || ''), 'danger');
											console.log(err);
											this.submitAttempt = false;
											if (loading) loading.dismiss();
										});
								});
						},
					},
				],
			})
			.then((alert) => {
				alert.present();
			});
	}

	async split() {
		let Status = this.selectedItems[0].Status;
		if (
			!(
				Status == 'ARInvoiceDraft' ||
				Status == 'ARInvoiceNew' ||
				Status == 'ARInvoiceRejected' ||
				Status == 'ARInvoicePending' ||
				Status == 'ARInvoiceSplited' ||
				Status == 'ARInvoiceMerged'
			)
		) {
			this.env.showMessage('Your selected order cannot be split. Please choose draft, new, pending for approval or disaaproved order', 'warning');
			return;
		}
		const modal = await this.modalController.create({
			component: ARInvoiceSplitModalPage,
			cssClass: 'modal-merge-arinvoice',
			componentProps: {
				selectedInvoice: this.selectedItems[0],
			},
		});
		await modal.present();
		const { data } = await modal.onWillDismiss();

		this.selectedItems = [];
		this.refresh();
	}

	async merge() {
		let itemsCanNotProcess = this.selectedItems.filter(
			(i) =>
				i.Status == 'EInvoiceRelease' ||
				i.Status == 'EInvoiceNew' ||
				i.Status == 'EInvoiceCancel' ||
				i.Status == 'ARInvoiceCancel' ||
				i.Status == 'ARInvoicePending' ||
				i.Status == 'ARInvoiceSplited' ||
				i.Status == 'ARInvoiceMerged'
		);
		if (itemsCanNotProcess.length == this.selectedItems.length) {
			this.env.showMessage('Your selected invoices cannot be combined. Please select new or disapproved invoice', 'warning');
			return;
		}

		itemsCanNotProcess.forEach((i) => {
			i.checked = false;
		});
		this.selectedItems = this.selectedItems.filter(
			(i) => i.Status == 'ARInvoiceApproved' || i.Status == 'ARInvoiceDraft' || i.Status == 'ARInvoiceRejected' || i.Status == 'ARInvoiceNew' || i.Status == 'EInvoiceNew'
		);

		// let _eInvoices = this.selectedItems.filter(f => f.Status == 'EInvoiceNew');

		// if (_eInvoices.length > 1) {
		//     this.env.showTranslateMessage('Có nhiều hơn 1 hóa đơn đã tạo HĐĐT, xin vui lòng kiểm tra lại!', 'warning')
		//     return;
		// }

		const modal = await this.modalController.create({
			component: ARInvoiceMergeModalPage,
			cssClass: 'modal-merge-arinvoice',
			componentProps: {
				selectedInvoices: this.selectedItems,
			},
		});
		await modal.present();
		const { data } = await modal.onWillDismiss();

		this.selectedItems = [];
		this.refresh();
	}
}
