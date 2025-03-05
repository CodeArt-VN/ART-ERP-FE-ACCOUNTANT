import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BANK_OutgoingPaymentProvider, BRA_BranchProvider, SYS_ConfigProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { SortConfig } from 'src/app/models/options-interface';

@Component({
	selector: 'app-outgoing-payment',
	templateUrl: 'outgoing-payment.page.html',
	styleUrls: ['outgoing-payment.page.scss'],
	standalone: false,
})
export class OutgoingPaymentPage extends PageBase {
	statusList: [];
	constructor(
		public pageProvider: BANK_OutgoingPaymentProvider,
		public branchProvider: BRA_BranchProvider,
		public modalController: ModalController,
		public sysConfigProvider: SYS_ConfigProvider,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location
	) {
		super();
	}

	preLoadData(event?: any): void {
		let sorted: SortConfig[] = [{ Dimension: 'Id', Order: 'DESC' }];
		this.pageConfig.sort = sorted;
		let sysConfigQuery = ['OutgoingPaymentUsedApprovalModule'];
		Promise.all([this.env.getStatus('OutgoingPaymentStatus'), this.sysConfigProvider.read({ Code_in: sysConfigQuery, IDBranch: this.env.selectedBranch })]).then(
			(values: any) => {
				if (values.length) {
					this.statusList = values[0];
					if (values[1]['data']) {
						values[1]['data'].forEach((e) => {
							if ((e.Value == null || e.Value == 'null') && e._InheritedConfig) {
								e.Value = e._InheritedConfig.Value;
							}
							this.pageConfig[e.Code] = JSON.parse(e.Value);
						});
					}
					if (this.pageConfig.OutgoingPaymentUsedApprovalModule) {
						this.pageConfig.canApprove = false;
					}
				}
				super.preLoadData(event);
			}
		);
	}
	changeSelection(i, e = null) {
		super.changeSelection(i, e);
		//NotSubmittedYet // Canceled // Unapproved // Submitted // Approved
		//WaitForPayment // Paid // PartiallyPaid // Unapproved
		const approveSet = new Set(['Submitted']);
		const disApproveSet = new Set(['Approved', 'Submitted']);
		const submitSet = new Set(['NotSubmittedYet', 'Unapproved']);
		const cancelSet = new Set(['NotSubmittedYet', 'Unapproved', 'Approved', 'Submitted']);
		const deleteSet = new Set(['NotSubmittedYet', 'Unapproved', 'Canceled']);
		const paySet = new Set(['Approved', 'WaitForPayment', 'PartiallyPaid']);
		const markAsPaidtSet = new Set(['Approved', 'WaitForPayment', 'PartiallyPaid']);
		const toolbarSet = new Set(['NotSubmittedYet', 'Unapproved', 'Submitted']);
		this.pageConfig.ShowApprove = this.selectedItems.every((i) => approveSet.has(i.Status));
		this.pageConfig.ShowSubmit = this.selectedItems.every((i) => submitSet.has(i.Status));
		this.pageConfig.ShowDisapprove = this.selectedItems.every((i) => disApproveSet.has(i.Status));
		this.pageConfig.ShowCancel = this.selectedItems.every((i) => cancelSet.has(i.Status));
		this.pageConfig.ShowDelete = this.selectedItems.every((i) => deleteSet.has(i.Status));
		this.pageConfig.ShowMarkAsPaid = this.selectedItems.every((i) => markAsPaidtSet.has(i.Status));
		this.pageConfig.ShowPay = this.selectedItems.every((i) => paySet.has(i.Status));
		this.pageConfig.ShowChangeBranch =
			this.pageConfig.ShowApprove =
			this.pageConfig.ShowDisapprove =
			this.pageConfig.ShowArchive =
			this.pageConfig.ShowDelete =
			this.pageConfig.ShowMerge =
			this.pageConfig.ShowSplit =
				this.selectedItems.every((i) => toolbarSet.has(i.Status));
	}

	submitForApproval() {
		if (!this.pageConfig.canSubmit) return;
		let ids = this.selectedItems.map((i) => i.Id);
		this.env.showPrompt({ code: 'Are you sure you want to submit {{value}} selected item(s)?', value: this.selectedItems.length }).then(() => {
			this.env
				.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'BANK/OutgoingPayment/Submit', ids).toPromise())
				.then((rs) => {
					this.env.showMessage('Saved', 'success');
					this.refresh();
				})
				.catch((err) => {
					if (err.error?.Message) {
						try {
							let messageObj = JSON.parse(err.error?.Message);
							if (messageObj && messageObj.Message1 && messageObj.Message2) {
								this.env.showPrompt({ code: messageObj.Message2 + '{{value}}', value: messageObj.DocumentEntry.toString() }, null, {
									code: messageObj.Message1 + '{{value}}',
									value: '[' + messageObj.payments.join(',') + ']',
								});
							} else this.env.showMessage(err.error?.Message ?? err, 'danger');
						} catch (e) {
							this.env.showMessage(err.error?.Message ?? err, 'danger');
						}
					} else this.env.showMessage(err, 'danger');
				});
		});
	}
	approve() {
		if (!this.pageConfig.canApprove) return;
		let ids = this.selectedItems.map((i) => i.Id);
		this.env.showPrompt({ code: 'Are you sure you want to approve {{value}} selected item(s)?', value: this.selectedItems.length }).then(() => {
			this.env
				.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'BANK/OutgoingPayment/approve', ids).toPromise())
				.then((rs) => {
					this.env.showMessage('Saved', 'success');
					this.refresh();
				})
				.catch((err) => {
					if (err.error?.Message) {
						try {
							let messageObj = JSON.parse(err.error?.Message);
							if (messageObj && messageObj.Message1 && messageObj.Message2) {
								this.env.showPrompt({ code: messageObj.Message2 + '{{value}}', value: messageObj.DocumentEntry.toString() }, null, {
									code: messageObj.Message1 + '{{value}}',
									value: '[' + messageObj.payments.join(',') + ']',
								});
							} else this.env.showMessage(err.error?.Message ?? err, 'danger');
						} catch (e) {
							this.env.showMessage(err.error?.Message ?? err, 'danger');
						}
					} else this.env.showMessage(err, 'danger');
				});
		});
	}

	disapprove() {
		if (!this.pageConfig.canApprove) return;
		let ids = this.selectedItems.map((i) => i.Id);
		this.env.showPrompt({ code: 'Are you sure you want to disapprove {{value}} selected item(s)?', value: this.selectedItems.length }).then(() => {
			this.env
				.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'BANK/OutgoingPayment/disapprove', ids).toPromise())
				.then((rs) => {
					this.env.showMessage('Saved', 'success');
					this.refresh();
				})
				.catch((err) => {
					if (err.error?.Message) {
						try {
							let messageObj = JSON.parse(err.error?.Message);
							if (messageObj && messageObj.Message1 && messageObj.Message2) {
								this.env.showPrompt({ code: messageObj.Message2 + '{{value}}', value: messageObj.DocumentEntry.toString() }, null, {
									code: messageObj.Message1 + '{{value}}',
									value: '[' + messageObj.payments.join(',') + ']',
								});
							} else this.env.showMessage(err.error?.Message ?? err, 'danger');
						} catch (e) {
							this.env.showMessage(err.error?.Message ?? err, 'danger');
						}
					} else this.env.showMessage(err, 'danger');
				});
		});
	}
	// cancel() {
	// 	if (!this.pageConfig.canCancel) return;
	// 	let ids = this.selectedItems.map((i) => i.Id);
	// 	this.env.showPrompt({ code: 'Are you sure you want to cancel {{value}} selected item(s)?', value: this.selectedItems.length }).then(() => {
	// 		this.env
	// 			.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'BANK/OutgoingPayment/Cancel', ids).toPromise())
	// 			.then((rs) => {
	// 				this.env.showMessage('Saved', 'success');
	// 				this.refresh();
	// 			})
	// 			.catch((err) => {
	// 				if (err.error?.Message) {
	// 					try {
	// 						let messageObj = JSON.parse(err.error?.Message);
	// 						if (messageObj && messageObj.Message1 && messageObj.Message2) {
	// 							this.env.showPrompt({ code: messageObj.Message2 + '{{value}}', value: messageObj.DocumentEntry.toString() }, null, {
	// 								code: messageObj.Message1 + '{{value}}',
	// 								value: '[' + messageObj.payments.join(',') + ']',
	// 							});
	// 						} else this.env.showMessage(err.error?.Message ?? err, 'danger');
	// 					} catch (e) {
	// 						this.env.showMessage(err.error?.Message ?? err, 'danger');
	// 					}
	// 				} else this.env.showMessage(err, 'danger');
	// 			});
	// 	});
	// }

	markAsPaid() {
		if (!this.pageConfig.canMarkAsPaid) return;
		let ids = this.selectedItems.map((i) => i.Id);
		this.env.showPrompt({ code: 'Are you sure you want to mark as paid {{value}} selected item(s)?', value: this.selectedItems.length }).then(() => {
			this.env
				.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'BANK/OutgoingPayment/MarkAsPaid', ids).toPromise())
				.then((rs) => {
					this.env.showMessage('Saved', 'success');
					this.refresh();
				})
				.catch((err) => {
					if (err.error?.Message) {
						try {
							let messageObj = JSON.parse(err.error?.Message);
							if (messageObj && messageObj.Message1 && messageObj.Message2) {
								this.env.showPrompt({ code: messageObj.Message2 + '{{value}}', value: messageObj.DocumentEntry.toString() }, null, {
									code: messageObj.Message1 + '{{value}}',
									value: '[' + messageObj.payments.join(',') + ']',
								});
							} else this.env.showMessage(err.error?.Message ?? err, 'danger');
						} catch (e) {
							this.env.showMessage(err.error?.Message ?? err, 'danger');
						}
					} else this.env.showMessage(err, 'danger');
				});
		});
	}

	pay() {
		this.env.showMessage('This feature will be available soon', 'warning');
	}
}
