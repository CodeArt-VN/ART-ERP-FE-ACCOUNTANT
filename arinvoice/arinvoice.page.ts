import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, SALE_OrderProvider, AC_ARInvoiceProvider, CRM_ContactProvider, SYS_ConfigProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ApiSetting } from 'src/app/services/static/api-setting';

import { ARInvoiceSplitModalPage } from '../arinvoice-split-modal/arinvoice-split-modal.page';
import { ARInvoiceMergeModalPage } from '../arinvoice-merge-modal/arinvoice-merge-modal.page';
import { EInvoiceService } from 'src/app/services/einvoice.service';
import { lib } from 'src/app/services/static/global-functions';
import { SortConfig } from 'src/app/models/options-interface';

@Component({
	selector: 'app-arinvoice',
	templateUrl: './arinvoice.page.html',
	styleUrls: ['./arinvoice.page.scss'],
	standalone: false,
})
export class ARInvoicePage extends PageBase {
	branchList = [];
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
		public sysConfigProvider: SYS_ConfigProvider,
		public navCtrl: NavController,

		public location: Location
	) {
		super();

		// this.pageConfig.isShowFeature = true;
		this.pageConfig.isShowSearch = false;

		let today = new Date();
		today.setDate(today.getDate() + 1);
	}

	preLoadData(event) {
		this.query.Status = "['ARInvoiceApproved','ARInvoiceRejected','ARInvoicePending']";
		let sorted: SortConfig[] = [
			{ Dimension: 'InvoiceDate', Order: 'DESC' },
			{ Dimension: 'Id', Order: 'DESC' },
		];
		this.pageConfig.sort = sorted;
		this.query.IDOwner = this.pageConfig.canViewAllData ? 'all' : this.env.user.StaffID;

		let sysConfigQuery = ['IsShowSOCode'];
		Promise.all([
			this.env.getStatus('ARInvoiceStatus'),
			this.sysConfigProvider.read({
				Code_in: sysConfigQuery,
				IDBranch: this.env.selectedBranch,
			}),
		]).then((values: any) => {
			this.statusList = values[0];
			this.statusList.unshift({
				Code: "['ARInvoiceApproved','ARInvoiceRejected','ARInvoicePending']",
				Name: 'Cần xem',
			});
			this.statusList.unshift({ Code: '', Name: 'All' });
			values[1]['data'].forEach((e) => {
				if ((e.Value == null || e.Value == 'null') && e._InheritedConfig) {
					e.Value = e._InheritedConfig.Value;
				}
				this.pageConfig[e.Code] = JSON.parse(e.Value);
			});
			super.preLoadData(event);
		});
	}

	loadedData(event) {
		this.items.forEach((i) => {
			i._Status = this.statusList.find((d) => d.Code == i.Status);
			i._QueryDate = lib.dateFormat(i.InvoiceDate);
		});
		super.loadedData(event);
		console.log(this.items);
	}

	approveInvoices() {
		if (!this.pageConfig.canApproveInvoice) {
			return;
		}

		let itemsCanNotProcess = this.selectedItems.filter((i) => !(i.Status == 'ARInvoicePending'));
		if (itemsCanNotProcess.length == this.selectedItems.length) {
			this.env.showMessage('Your selected order cannot be approved. Please only select pending for approval order', 'warning');
		} else {
			itemsCanNotProcess.forEach((i) => {
				i.checked = false;
			});
			this.selectedItems = this.selectedItems.filter((i) => i.Status == 'ARInvoicePending');

			this.alertCtrl
				.create({
					header: 'Duyệt ' + this.selectedItems.length + ' hóa đơn',
					//subHeader: '---',
					message: 'Bạn có chắc muốn xác nhận ' + this.selectedItems.length + ' hóa đơn đang chọn?',
					buttons: [
						{
							text: 'Không',
							role: 'cancel',
							handler: () => {
								//console.log('Không xóa');
							},
						},
						{
							text: 'Duyệt',
							cssClass: 'danger-btn',
							handler: () => {
								let publishEventCode = this.pageConfig.pageName;
								let apiPath = {
									method: 'POST',
									url: function () {
										return ApiSetting.apiDomain('AC/ARInvoice/ApproveInvoices/');
									},
								};

								if (this.submitAttempt == false) {
									this.submitAttempt = true;

									let postDTO = { Ids: [] };
									postDTO.Ids = this.selectedItems.map((e) => e.Id);

									this.pageProvider.commonService
										.connect(apiPath.method, apiPath.url(), postDTO)
										.toPromise()
										.then((savedItem: any) => {
											if (publishEventCode) {
												this.env.publishEvent({
													Code: publishEventCode,
												});
											}
											this.env.showMessage('Saving completed!', 'success');
											this.submitAttempt = false;
										})
										.catch((err) => {
											this.submitAttempt = false;
											//console.log(err);
										});
								}
							},
						},
					],
				})
				.then((alert) => {
					alert.present();
				});
		}
	}

	disapproveInvoices() {
		if (!this.pageConfig.canApproveInvoice) {
			return;
		}

		let itemsCanNotProcess = this.selectedItems.filter((i) => !(i.Status == 'ARInvoicePending' || i.Status == 'ARInvoiceApproved'));
		if (itemsCanNotProcess.length == this.selectedItems.length) {
			this.env.showMessage('Your selected invoices cannot be disaaproved. Please select approved or pending for approval invoice', 'warning');
		} else {
			itemsCanNotProcess.forEach((i) => {
				i.checked = false;
			});
			this.selectedItems = this.selectedItems.filter((i) => i.Status == 'ARInvoicePending' || i.Status == 'ARInvoiceApproved');

			this.alertCtrl
				.create({
					header: 'Từ chối duyệt ' + this.selectedItems.length + ' hóa đơn',
					//subHeader: '---',
					message: 'Bạn có chắc muốn từ chối duyệt ' + this.selectedItems.length + ' hóa đơn đang chọn?',
					buttons: [
						{
							text: 'Không',
							role: 'cancel',
							handler: () => {
								//console.log('Không xóa');
							},
						},
						{
							text: 'Từ chối',
							cssClass: 'danger-btn',
							handler: () => {
								let publishEventCode = this.pageConfig.pageName;
								let apiPath = {
									method: 'POST',
									url: function () {
										return ApiSetting.apiDomain('AC/ARInvoice/DisapproveInvoices/');
									},
								};

								if (this.submitAttempt == false) {
									this.submitAttempt = true;

									let postDTO = { Ids: [] };
									postDTO.Ids = this.selectedItems.map((e) => e.Id);

									this.pageProvider.commonService
										.connect(apiPath.method, apiPath.url(), postDTO)
										.toPromise()
										.then((savedItem: any) => {
											if (publishEventCode) {
												this.env.publishEvent({
													Code: publishEventCode,
												});
											}
											this.env.showMessage('Saving completed!', 'success');
											this.submitAttempt = false;
										})
										.catch((err) => {
											this.submitAttempt = false;
											//console.log(err);
										});
								}
							},
						},
					],
				})
				.then((alert) => {
					alert.present();
				});
		}
	}

	cancelInvoices() {
		if (!this.pageConfig.canCancelInvoice) {
			return;
		}

		let itemsCanNotProcess = this.selectedItems.filter((i) => i.Status == 'ARInvoiceCanceled' || i.Status == 'ARInvoiceSplited' || i.Status == 'ARInvoiceMerged');
		if (itemsCanNotProcess.length == this.selectedItems.length) {
			this.env.showMessage('Your selected invoices cannot be canceled. Please select draft or pending for approval invoice', 'warning');
		} else {
			itemsCanNotProcess.forEach((i) => {
				i.checked = false;
			});
			this.selectedItems = this.selectedItems.filter((i) => !(i.Status == 'ARInvoiceCanceled' || i.Status == 'ARInvoiceSplited' || i.Status == 'ARInvoiceMerged'));

			this.alertCtrl
				.create({
					header: 'HỦY ' + this.selectedItems.length + ' hóa đơn',
					//subHeader: '---',
					message: 'Bạn có chắc muốn HỦY ' + this.selectedItems.length + ' hóa đơn đang chọn?',
					buttons: [
						{
							text: 'Không',
							role: 'cancel',
							handler: () => {
								//console.log('Không xóa');
							},
						},
						{
							text: 'Hủy',
							cssClass: 'danger-btn',
							handler: () => {
								let publishEventCode = this.pageConfig.pageName;
								let apiPath = {
									method: 'POST',
									url: function () {
										return ApiSetting.apiDomain('AC/ARInvoice/CancelInvoices/');
									},
								};

								if (this.submitAttempt == false) {
									this.submitAttempt = true;

									let postDTO = { Ids: [] };
									postDTO.Ids = this.selectedItems.map((e) => e.Id);

									this.pageProvider.commonService
										.connect(apiPath.method, apiPath.url(), postDTO)
										.toPromise()
										.then((savedItem: any) => {
											if (publishEventCode) {
												this.env.publishEvent({
													Code: publishEventCode,
												});
											}
											this.env.showMessage('Saving completed!', 'success');
											this.submitAttempt = false;
										})
										.catch((err) => {
											this.submitAttempt = false;
											//console.log(err);
										});
								}
							},
						},
					],
				})
				.then((alert) => {
					alert.present();
				});
		}
	}

	submitInvoicesForApproval() {
		if (!this.pageConfig.canApproveInvoice) {
			return;
		}

		let itemsCanNotProcess = this.selectedItems.filter((i) => !(i.Status == 'ARInvoiceDraft' || i.Status == 'ARInvoiceRejected' || i.Status == 'ARInvoiceNew'));
		if (itemsCanNotProcess.length == this.selectedItems.length) {
			this.env.showMessage('Your selected invoices cannot be approved. Please select new or draft or disapproved ones', 'warning');
		} else {
			itemsCanNotProcess.forEach((i) => {
				i.checked = false;
			});
			this.selectedItems = this.selectedItems.filter((i) => i.Status == 'ARInvoiceDraft' || i.Status == 'ARInvoiceRejected' || i.Status == 'ARInvoiceNew');

			this.alertCtrl
				.create({
					header: 'Gửi duyệt ' + this.selectedItems.length + ' hóa đơn',
					//subHeader: '---',
					message: 'Bạn có chắc muốn gửi duyệt ' + this.selectedItems.length + ' hóa đơn đang chọn?',
					buttons: [
						{
							text: 'Không',
							role: 'cancel',
							handler: () => {
								//console.log('Không xóa');
							},
						},
						{
							text: 'Gửi',
							cssClass: 'danger-btn',
							handler: () => {
								let publishEventCode = this.pageConfig.pageName;
								let apiPath = {
									method: 'POST',
									url: function () {
										return ApiSetting.apiDomain('AC/ARInvoice/SubmitInvoicesForApproval/');
									},
								};

								if (this.submitAttempt == false) {
									this.submitAttempt = true;

									let postDTO = { Ids: [] };
									postDTO.Ids = this.selectedItems.map((e) => e.Id);

									this.pageProvider.commonService
										.connect(apiPath.method, apiPath.url(), postDTO)
										.toPromise()
										.then((savedItem: any) => {
											if (publishEventCode) {
												this.env.publishEvent({
													Code: publishEventCode,
												});
											}
											this.env.showMessage('Saving completed!', 'success');
											this.submitAttempt = false;
										})
										.catch((err) => {
											this.submitAttempt = false;
											//console.log(err);
										});
								}
							},
						},
					],
				})
				.then((alert) => {
					alert.present();
				});
		}
	}

	deleteItems() {
		let itemsCanNotDelete = this.selectedItems.filter(
			(i) =>
				i.Status == 'ARInvoiceApproved' ||
				i.Status == 'EInvoiceNew' ||
				i.Status == 'EInvoiceRelease' ||
				i.Status == 'ARInvoiceApproved' ||
				i.Status == 'EInvoiceWaitForSign'
		);
		if (itemsCanNotDelete.length == this.selectedItems.length) {
			this.env.showMessage('Your selected invoices cannot be deleted. Please only delete new or disapproved invoice', 'warning');
		} else if (itemsCanNotDelete.length) {
			this.alertCtrl
				.create({
					header: 'Có ' + itemsCanNotDelete.length + ' hóa đơn không thể xóa',
					//subHeader: '---',
					message: 'Bạn có muốn bỏ qua ' + this.selectedItems.length + ' hóa đơn này và tiếp tục xóa?',
					buttons: [
						{
							text: 'Không',
							role: 'cancel',
							handler: () => {
								//console.log('Không xóa');
							},
						},
						{
							text: 'Đồng ý tiếp tục',
							cssClass: 'danger-btn',
							handler: () => {
								itemsCanNotDelete.forEach((i) => {
									i.checked = false;
								});
								this.selectedItems = this.selectedItems.filter(
									(i) => i.Status == 'ARInvoiceNew' || i.Status == 'ARInvoiceRejected' || i.Status == 'ARInvoiceDraft'
								);
								super.deleteItems();
							},
						},
					],
				})
				.then((alert) => {
					alert.present();
				});
		} else {
			super.deleteItems();
		}
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
			this.env.showMessage('Vui lòng chọn hóa đơn cần cập nhật dữ liệu');
			return;
		}
		this.submitAttempt = true;

		this.env
			.showLoading('Please wait for a few moments', this.EInvoiceService.UpdateEInvoice(this.selectedItems.map((i) => i.Id)).toPromise())
			.then((resp: any) => {
				this.submitAttempt = false;
				this.env.showMessage('Đã cập nhật hóa đơn điện tử thành công!', 'success');
				this.refresh();
			})
			.catch((err) => {
				if (err?.error?.ExceptionMessage) {
					this.env.showMessage(err.error.ExceptionMessage, 'danger');
				} else if (err.message) {
					this.env.showMessage(err.message, 'danger');
				} else {
					this.env.showMessage('Có lỗi khi cập nhật, xin vui lòng thử lại sau', 'danger');
				}

				this.submitAttempt = false;
			});
	}

	signARInvoice() {
		if (this.submitAttempt) return;
		this.selectedItems = this.selectedItems.filter((i) => i.Status == 'EInvoiceNew');
		if (!this.selectedItems.length) {
			this.env.showMessage('Vui lòng chọn hóa đơn cần ký');
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
			this.env.showMessage('Vui lòng chọn hóa đơn cần đồng bộ dữ liệu');
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
													{ code: 'Có {{value}} hóa đơn lỗi, vui lòng kiểm tra lại ghi chú của các hóa đơn không được duyệt.', value: errors.length },
													'Xuất hóa đơn'
												);
												this.refresh();
											} else {
												this.env.showMessage('Đã xuất hóa đơn điện tử!', 'success');
												this.submitAttempt = false;
												this.refresh();
											}
										})
										.catch((err: any) => {
											this.env.showMessage('Không xuất hóa đơn được, xin vui lòng kiểm tra lại! \n' + err?.error?.ExceptionMessage, 'danger');
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

	async splitARInvoice() {
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

	async mergeARInvoice() {
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
