import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, SALE_OrderProvider, SYS_StatusProvider, AC_ARInvoiceProvider, CRM_ContactProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ApiSetting } from 'src/app/services/static/api-setting';

import { ARInvoiceSplitModalPage } from '../arinvoice-split-modal/arinvoice-split-modal.page';
import { ARInvoiceMergeModalPage } from '../arinvoice-merge-modal/arinvoice-merge-modal.page';
import { EInvoiceService } from 'src/app/services/einvoice.service';

@Component({
    selector: 'app-arinvoice',
    templateUrl: './arinvoice.page.html',
    styleUrls: ['./arinvoice.page.scss'],
})
export class ARInvoicePage extends PageBase {
    baseURL = ApiSetting.mainService.base;
    branchList = [];
    statusList = [];

    constructor(
        public pageProvider: AC_ARInvoiceProvider,
        public branchProvider: BRA_BranchProvider,
        public statusProvider: SYS_StatusProvider,
        public orderProvider: SALE_OrderProvider,
        public contactProvider: CRM_ContactProvider,
        public EInvoiceService: EInvoiceService,
        public modalController: ModalController,
        public popoverCtrl: PopoverController,
        public alertCtrl: AlertController,
        public loadingController: LoadingController,
        public env: EnvService,
        public navCtrl: NavController,
        public location: Location) {
        super();

        // this.pageConfig.isShowFeature = true;
        this.pageConfig.isShowSearch = false;

        let today = new Date;
        today.setDate(today.getDate() + 1);
    }

    preLoadData(event) {
        this.query.Status = "['ARInvoiceApproved','ARInvoiceRejected','ARInvoicePending']";

        this.sortToggle('InvoiceDate', true);
        //this.sort.Id = 'Id';
        this.sortToggle('Id', true);

        Promise.all([
            this.env.getStatus('ARInvoiceStatus'),

        ]).then((values: any) => {
            this.statusList = values[0];


            super.preLoadData(event);
        });
        // this.statusProvider.read({ IDParent: 11 }).then(response => {
        //   this.statusList = response['data'];
        //   super.preLoadData(event);

        // });
    }

    loadData(event) {
        this.pageProvider.apiPath.getList.url = function () { return ApiSetting.apiDomain("AC/ARInvoice/") };
        super.loadData(event);
    }

    loadedData(event) {

        this.items.forEach(i => {
            i._Status = this.statusList.find(d => d.Code == i.Status);
        });
        super.loadedData(event);
    }

    showDetail(i) {
        this.navCtrl.navigateForward('/arinvoice/' + i.Id);
    }

    add() {
        let newARInvoice = {
            Id: 0,
        };
        this.showDetail(newARInvoice);
    }

    approveInvoices() {
        if (!this.pageConfig.canApproveInvoice) {
            return;
        }

        let itemsCanNotProcess = this.selectedItems.filter(i => !(i.Status == 'ARInvoicePending'));
        if (itemsCanNotProcess.length == this.selectedItems.length) {
            this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.can-not-approve-pending-only', 'warning');
        }
        else {
            itemsCanNotProcess.forEach(i => {
                i.checked = false;
            });
            this.selectedItems = this.selectedItems.filter(i => (i.Status == 'ARInvoicePending'));

            this.alertCtrl.create({
                header: 'Duy???t ' + this.selectedItems.length + ' h??a ????n',
                //subHeader: '---',
                message: 'B???n ch???c mu???n x??c nh???n ' + this.selectedItems.length + ' h??a ????n ??ang ch???n?',
                buttons: [
                    {
                        text: 'Kh??ng',
                        role: 'cancel',
                        handler: () => {
                            //console.log('Kh??ng x??a');
                        }
                    },
                    {
                        text: 'Duy???t',
                        cssClass: 'danger-btn',
                        handler: () => {

                            let publishEventCode = this.pageConfig.pageName;
                            let apiPath = {
                                method: "POST",
                                url: function () { return ApiSetting.apiDomain("AC/ARInvoice/ApproveInvoices/") }
                            };

                            if (this.submitAttempt == false) {
                                this.submitAttempt = true;

                                let postDTO = { Ids: [] };
                                postDTO.Ids = this.selectedItems.map(e => e.Id);

                                this.pageProvider.commonService.connect(apiPath.method, apiPath.url(), postDTO).toPromise()
                                    .then((savedItem: any) => {
                                        if (publishEventCode) {
                                            this.env.publishEvent({ Code: publishEventCode });
                                        }
                                        this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.save-complete', 'success');
                                        this.submitAttempt = false;

                                    }).catch(err => {
                                        this.submitAttempt = false;
                                        //console.log(err);
                                    });
                            }

                        }
                    }
                ]
            }).then(alert => {
                alert.present();
            })
        }
    }

    disapproveInvoices() {
        if (!this.pageConfig.canApproveInvoice) {
            return;
        }

        let itemsCanNotProcess = this.selectedItems.filter(i => !(i.Status == 'ARInvoicePending' || i.Status == 'ARInvoiceApproved'));
        if (itemsCanNotProcess.length == this.selectedItems.length) {
            this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.can-not-disapprove-pending-approved-only', 'warning');
        }
        else {
            itemsCanNotProcess.forEach(i => {
                i.checked = false;
            });
            this.selectedItems = this.selectedItems.filter(i => (i.Status == 'ARInvoicePending' || i.Status == 'ARInvoiceApproved'));

            this.alertCtrl.create({
                header: 'T??? ch???i duy???t ' + this.selectedItems.length + ' h??a ????n',
                //subHeader: '---',
                message: 'B???n ch???c mu???n t??? ch???i duy???t ' + this.selectedItems.length + ' h??a ????n ??ang ch???n?',
                buttons: [
                    {
                        text: 'Kh??ng',
                        role: 'cancel',
                        handler: () => {
                            //console.log('Kh??ng x??a');
                        }
                    },
                    {
                        text: 'T??? ch???i',
                        cssClass: 'danger-btn',
                        handler: () => {

                            let publishEventCode = this.pageConfig.pageName;
                            let apiPath = {
                                method: "POST",
                                url: function () { return ApiSetting.apiDomain("AC/ARInvoice/DisapproveInvoices/") }
                            };

                            if (this.submitAttempt == false) {
                                this.submitAttempt = true;

                                let postDTO = { Ids: [] };
                                postDTO.Ids = this.selectedItems.map(e => e.Id);

                                this.pageProvider.commonService.connect(apiPath.method, apiPath.url(), postDTO).toPromise()
                                    .then((savedItem: any) => {
                                        if (publishEventCode) {
                                            this.env.publishEvent({ Code: publishEventCode });
                                        }
                                        this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.save-complete', 'success');
                                        this.submitAttempt = false;

                                    }).catch(err => {
                                        this.submitAttempt = false;
                                        //console.log(err);
                                    });
                            }

                        }
                    }
                ]
            }).then(alert => {
                alert.present();
            })
        }
    }

    cancelInvoices() {

        if (!this.pageConfig.canCancelInvoice) {
            return;
        }

        let itemsCanNotProcess = this.selectedItems.filter(i => (i.Status == 'ARInvoiceCanceled' || i.Status == 'ARInvoiceSplited' || i.Status == 'ARInvoiceMerged'));
        if (itemsCanNotProcess.length == this.selectedItems.length) {
            this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.can-not-cancel-pending-draft-only', 'warning');
        }
        else {
            itemsCanNotProcess.forEach(i => {
                i.checked = false;
            });
            this.selectedItems = this.selectedItems.filter(i => !(i.Status == 'ARInvoiceCanceled' || i.Status == 'ARInvoiceSplited' || i.Status == 'ARInvoiceMerged'));

            this.alertCtrl.create({
                header: 'H???Y ' + this.selectedItems.length + ' h??a ????n',
                //subHeader: '---',
                message: 'B???n ch???c mu???n H???Y ' + this.selectedItems.length + ' h??a ????n ??ang ch???n?',
                buttons: [
                    {
                        text: 'Kh??ng',
                        role: 'cancel',
                        handler: () => {
                            //console.log('Kh??ng x??a');
                        }
                    },
                    {
                        text: 'H???y',
                        cssClass: 'danger-btn',
                        handler: () => {

                            let publishEventCode = this.pageConfig.pageName;
                            let apiPath = {
                                method: "POST",
                                url: function () { return ApiSetting.apiDomain("AC/ARInvoice/CancelInvoices/") }
                            };

                            if (this.submitAttempt == false) {
                                this.submitAttempt = true;

                                let postDTO = { Ids: [] };
                                postDTO.Ids = this.selectedItems.map(e => e.Id);

                                this.pageProvider.commonService.connect(apiPath.method, apiPath.url(), postDTO).toPromise()
                                    .then((savedItem: any) => {
                                        if (publishEventCode) {
                                            this.env.publishEvent({ Code: publishEventCode });
                                        }
                                        this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.save-complete', 'success');
                                        this.submitAttempt = false;

                                    }).catch(err => {
                                        this.submitAttempt = false;
                                        //console.log(err);
                                    });
                            }

                        }
                    }
                ]
            }).then(alert => {
                alert.present();
            })
        }

    }

    submitInvoicesForApproval() {
        if (!this.pageConfig.canApproveInvoice) {
            return;
        }

        let itemsCanNotProcess = this.selectedItems.filter(i => !(i.Status == 'ARInvoiceDraft' || i.Status == 'ARInvoiceRejected' || i.Status == 'ARInvoiceNew'));
        if (itemsCanNotProcess.length == this.selectedItems.length) {
            this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.can-not-send-approve-new-draft-disapprove-only', 'warning');
        }
        else {
            itemsCanNotProcess.forEach(i => {
                i.checked = false;
            });
            this.selectedItems = this.selectedItems.filter(i => (i.Status == 'ARInvoiceDraft' || i.Status == 'ARInvoiceRejected' || i.Status == 'ARInvoiceNew'));

            this.alertCtrl.create({
                header: 'G???i duy???t ' + this.selectedItems.length + ' h??a ????n',
                //subHeader: '---',
                message: 'B???n ch???c mu???n g???i duy???t ' + this.selectedItems.length + ' h??a ????n ??ang ch???n?',
                buttons: [
                    {
                        text: 'Kh??ng',
                        role: 'cancel',
                        handler: () => {
                            //console.log('Kh??ng x??a');
                        }
                    },
                    {
                        text: 'G???i',
                        cssClass: 'danger-btn',
                        handler: () => {

                            let publishEventCode = this.pageConfig.pageName;
                            let apiPath = {
                                method: "POST",
                                url: function () { return ApiSetting.apiDomain("AC/ARInvoice/SubmitInvoicesForApproval/") }
                            };

                            if (this.submitAttempt == false) {
                                this.submitAttempt = true;

                                let postDTO = { Ids: [] };
                                postDTO.Ids = this.selectedItems.map(e => e.Id);

                                this.pageProvider.commonService.connect(apiPath.method, apiPath.url(), postDTO).toPromise()
                                    .then((savedItem: any) => {
                                        if (publishEventCode) {
                                            this.env.publishEvent({ Code: publishEventCode });
                                        }
                                        this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.save-complete', 'success');
                                        this.submitAttempt = false;

                                    }).catch(err => {
                                        this.submitAttempt = false;
                                        //console.log(err);
                                    });
                            }

                        }
                    }
                ]
            }).then(alert => {
                alert.present();
            })
        }
    }

    deleteItems() {
        let itemsCanNotDelete = this.selectedItems.filter(i => i.Status == 'ARInvoiceApproved' || i.Status == 'EInvoiceNew' || i.Status == 'EInvoiceRelease' || i.Status == 'ARInvoiceApproved' || i.Status == 'EInvoiceWaitForSign');
        if (itemsCanNotDelete.length == this.selectedItems.length) {
            this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.can-not-delete-new-disapprove-only', 'warning');
        }
        else if (itemsCanNotDelete.length) {
            this.alertCtrl.create({
                header: 'C?? ' + itemsCanNotDelete.length + ' h??a ????n kh??ng th??? x??a',
                //subHeader: '---',
                message: 'B???n c?? mu???n b??? qua ' + this.selectedItems.length + ' h??a ????n n??y v?? ti???p t???c x??a?',
                buttons: [
                    {
                        text: 'Kh??ng',
                        role: 'cancel',
                        handler: () => {
                            //console.log('Kh??ng x??a');
                        }
                    },
                    {
                        text: '?????ng ?? ti???p t???c',
                        cssClass: 'danger-btn',
                        handler: () => {
                            itemsCanNotDelete.forEach(i => {
                                i.checked = false;
                            });
                            this.selectedItems = this.selectedItems.filter(i => (i.Status == 'ARInvoiceNew' || i.Status == 'ARInvoiceRejected' || i.Status == 'ARInvoiceDraft'));
                            super.deleteItems();
                        }
                    }
                ]
            }).then(alert => {
                alert.present();
            })
        }
        else {
            super.deleteItems();
        }



    }

    createEInvoice() {
        if (!this.pageConfig.canCreateEInvoice) {
            return;
        }

        if (this.selectedItems.length == 0) {
            this.alertCtrl.create({
                header: 'Xu???t h??a ????n ??i???n t???',
                //subHeader: '---',
                message: 'B???n ch??a ch???n ho?? ????n n??o, b???n c?? mu???n h??? th???ng t??? t???o h??a ????n g???p v?? xu???t H????T cho c??c KH??CH H??NG KH??NG L???Y H??A ????N hay kh??ng?',
                buttons: [
                    {
                        text: 'Kh??ng',
                        role: 'cancel',
                        handler: () => {

                        }
                    },
                    {
                        text: '?????ng ??',
                        cssClass: 'success-btn',
                        handler: () => {
                            this.EInvoiceService.AutoMergeARAndCreateEInvoice(this.query.InvoiceDate)
                                .then((resp: any) => {
                                    if (resp == 'empty') {
                                        this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.issue-einvoice-message-empty', 'warning');
                                    }
                                    else if (resp == '') {
                                        this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.issue-einvoice-message-success', 'success');
                                    }
                                    else {
                                        this.env.showTranslateMessage(resp, 'error');
                                    }

                                    this.submitAttempt = false;
                                    this.refresh();
                                }).finally(() => {

                                })
                        }
                    }
                ]
            }).then(alert => {
                alert.present();
            })
        }
        else {
            let itemsCanNotProcess = this.selectedItems.filter(i => (i.Status != 'ARInvoiceApproved'));
            if (itemsCanNotProcess.length == this.selectedItems.length) {
                this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.can-not-create-einvoice-approved-only', 'warning');
            }
            else {
                itemsCanNotProcess.forEach(i => {
                    i.checked = false;
                });

                this.selectedItems = this.selectedItems.filter(i => (i.Status == 'ARInvoiceApproved'));

                this.showCreateEInvoicePopup();
            }
        }
    }

    updateEInvoice() {
        if (this.submitAttempt) return;
        
        this.selectedItems = this.selectedItems.filter(i => (i.Status == 'EInvoiceNew'));
        if (!this.selectedItems.length) {
            this.env.showMessage('Vui l??ng ch???n h??a ????n c???n c???p nh???t d??? li???u');
            return;
        }
        this.submitAttempt = true;

        this.env.showLoading('Vui l??ng ch??? c???p nh???t h??a ????n...', this.EInvoiceService.UpdateEInvoice(this.selectedItems.map(i => i.Id)).toPromise())
        .then((resp: any) => {
            this.submitAttempt = false;
            this.env.showMessage('???? c???p nh???t h??a ????n ??i???n t??? th??nh c??ng!', 'success');
            this.refresh();
        })
        .catch(err => {
            console.log(err);
            if (err?.error?.ExceptionMessage) {
                this.env.showMessage(err.error.ExceptionMessage, 'danger');
            }
            else if (err.message) {
                this.env.showMessage(err.message, 'danger');
            }
            else{
                this.env.showMessage('C?? l???i khi c???p nh???t, xin vui l??ng th??? l???i sau', 'danger');
            }
            
            this.submitAttempt = false;
        });
    }

    syncEInvoice() {
        if (this.submitAttempt) return;
        
        this.selectedItems = this.selectedItems.filter(i => (i.Status == 'EInvoiceNew'));
        if (!this.selectedItems.length) {
            this.env.showMessage('Vui l??ng ch???n h??a ????n c???n ?????ng b??? d??? li???u');
            return;
        }
        this.submitAttempt = true;

        this.env.showLoading('Vui l??ng ch??? ?????ng b??? h??a ????n...', this.EInvoiceService.SyncEInvoice(this.selectedItems.map(i => i.Id)).toPromise())
            .then((resp: any) => {
                this.submitAttempt = false;
                this.refresh();
            })
            .catch(err => {
                console.log(err);
                this.submitAttempt = false;
            });
    }

    showCreateEInvoicePopup() {
        this.alertCtrl.create({
            header: 'Xu???t h??a ????n ??i???n t???',
            //subHeader: '---',
            message: 'B???n c?? ch???c mu???n xu???t h??a ????n ??i???n t??? cho c??c h??a ????n n??y?',
            buttons: [
                {
                    text: 'Kh??ng',
                    role: 'cancel',
                    handler: () => { }
                },
                {
                    text: 'C??',
                    cssClass: 'success-btn',
                    handler: () => {
                        this.loadingController.create({
                            cssClass: 'my-custom-class',
                            message: 'Vui l??ng ch??? c???p s??? h??a ????n...'
                        }).then((loading) => {
                            loading.present();
                            this.EInvoiceService.CreateEInvoice(this.selectedItems.map(i => i.Id)).toPromise()
                                .then((resp: any) => {
                                    this.selectedItems = [];
                                    if (loading) loading.dismiss();
                                    this.submitAttempt = false;

                                    let errors = resp.filter(d => d.Status == 1);
                                    let message = '';

                                    for (let i = 0; i < errors.length && i <= 5; i++)
                                        if (i == 5) message += '<br> C??n n???a...';
                                        else {
                                            const e = errors[i];
                                            message += '<br> #' + e.PartnerInvoiceID + ' l???i: ' + e.MessLog;
                                        }
                                    if (message != '') {
                                        this.env.showAlert(message, 'C?? ' + errors.length + ' h??a ????n l???i, vui l??ng ki???m tra l???i ghi ch?? c???a c??c h??a ????n kh??ng ???????c duy???t.', 'Xu???t h??a ????n');
                                        this.refresh();
                                    }
                                    else {
                                        this.env.showMessage('???? xu???t h??a ????n ??i???n t???!', 'success');
                                        this.submitAttempt = false;
                                        this.refresh();
                                    }
                                })
                                .catch(err => {
                                    console.log(err);
                                    this.submitAttempt = false;
                                    if (loading) loading.dismiss();
                                })
                        })
                    }
                }
            ]
        }).then(alert => {
            alert.present();
        })
    }

    async splitARInvoice() {
        let Status = this.selectedItems[0].Status;
        if (!(Status == 'ARInvoiceDraft' || Status == 'ARInvoiceNew' || Status == 'ARInvoiceRejected' || Status == 'ARInvoicePending' || Status == 'ARInvoiceSplited' || Status == 'ARInvoiceMerged')) {
            this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.can-not-split', 'warning');
            return;
        }
        const modal = await this.modalController.create({
            component: ARInvoiceSplitModalPage,
            swipeToClose: true,
            cssClass: 'modal-merge-arinvoice',
            componentProps: {
                'selectedInvoice': this.selectedItems[0]
            }
        });
        await modal.present();
        const { data } = await modal.onWillDismiss();

        this.selectedItems = [];
        this.refresh();
    }

    async mergeARInvoice() {
        let itemsCanNotProcess = this.selectedItems.filter(i => i.Status == 'EInvoiceRelease' || i.Status == 'EInvoiceNew' || i.Status == 'EInvoiceCancel' || i.Status == 'ARInvoiceCancel' || i.Status == 'ARInvoicePending' || i.Status == 'ARInvoiceSplited' || i.Status == 'ARInvoiceMerged');
        if (itemsCanNotProcess.length == this.selectedItems.length) {
            this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.can-not-merge', 'warning');
            return;
        }

        itemsCanNotProcess.forEach(i => {
            i.checked = false;
        });
        this.selectedItems = this.selectedItems.filter(i => (i.Status == 'ARInvoiceApproved' || i.Status == 'ARInvoiceDraft' || i.Status == 'ARInvoiceRejected' || i.Status == 'ARInvoiceNew' || i.Status == 'EInvoiceNew'));

        // let _eInvoices = this.selectedItems.filter(f => f.Status == 'EInvoiceNew');

        // if (_eInvoices.length > 1) {
        //     this.env.showMessage('C?? nhi???u h??n 1 h??a ????n ???? t???o H????T, xin vui l??ng ki???m tra l???i!', 'warning')
        //     return;
        // }

        const modal = await this.modalController.create({
            component: ARInvoiceMergeModalPage,
            swipeToClose: true,
            cssClass: 'modal-merge-arinvoice',
            componentProps: {
                'selectedInvoices': this.selectedItems
            }
        });
        await modal.present();
        const { data } = await modal.onWillDismiss();

        this.selectedItems = [];
        this.refresh();
    }
}
