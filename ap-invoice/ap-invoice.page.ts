import { Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, SALE_OrderProvider, SYS_StatusProvider, CRM_ContactProvider, SYS_ConfigProvider, AC_APInvoiceProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';

import { ARInvoiceSplitModalPage } from '../arinvoice-split-modal/arinvoice-split-modal.page';
import { ARInvoiceMergeModalPage } from '../arinvoice-merge-modal/arinvoice-merge-modal.page';

import { EInvoiceService } from 'src/app/services/einvoice.service';
import { __makeTemplateObject } from 'tslib';
import { isNumber } from '@amcharts/amcharts5/.internal/core/util/Type';

@Component({
    selector: 'app-ap-invoice',
    templateUrl: './ap-invoice.page.html',
    styleUrls: ['./ap-invoice.page.scss'],
})
export class APInvoicePage extends PageBase {
    baseURL = ApiSetting.mainService.base;
    branchList = [];
    statusList = [];

    constructor(
        public pageProvider: AC_APInvoiceProvider,
        public branchProvider: BRA_BranchProvider,
        public statusProvider: SYS_StatusProvider,
        public orderProvider: SALE_OrderProvider,
        public contactProvider: CRM_ContactProvider,
        public sysConfigProvider: SYS_ConfigProvider,

        public EInvoiceService: EInvoiceService,

        public modalController: ModalController,
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
        Promise.all([
            this.env.getStatus('ARInvoiceStatus'),

        ]).then((values: any) => {
            this.statusList = values[0];

            this.sort.Id = 'Id';
            this.sortToggle('Id', true);
            super.preLoadData(event);
        });
        // this.statusProvider.read({ IDParent: 11 }).then(response => {
        //   this.statusList = response['data'];
        //   super.preLoadData(event);

        // });
    }

    loadData(event) {
        this.pageProvider.apiPath.getList.url = function () { return ApiSetting.apiDomain("AC/APInvoice/") };
        super.loadData(event);
    }

    loadedData(event) {

        this.items.forEach(i => {

            i.InvoiceDateText = i.InvoiceDate ? lib.dateFormat(i.InvoiceDate, 'dd/mm/yy') : '';
            i.SignedDateText = i.SignedDate ? lib.dateFormat(i.SignedDate, 'dd/mm/yy') : '';
            i.SignedDateTime = i.SignedDate ? lib.dateFormat(i.SignedDate, 'hh:MM') : '';
            //i.Query = i.InvoiceDate ? lib.dateFormat(i.InvoiceDate, 'yyyy-mm-dd') : '';
            i.TotalText = lib.currencyFormat(i.TotalAfterTax);

            i._Status = this.statusList.find(d => d.Code == i.Status);

        });
        super.loadedData(event);
    }

    showDetail(i) {
        this.navCtrl.navigateForward('/ap-invoice/' + i.Id);
    }

    add() {
        let newAPInvoice = {
            Id: 0,
        };
        this.showDetail(newAPInvoice);
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
                header: 'Duyệt ' + this.selectedItems.length + ' hóa đơn',
                //subHeader: '---',
                message: 'Bạn chắc muốn xác nhận ' + this.selectedItems.length + ' hóa đơn đang chọn?',
                buttons: [
                    {
                        text: 'Không',
                        role: 'cancel',
                        handler: () => {
                            //console.log('Không xóa');
                        }
                    },
                    {
                        text: 'Duyệt',
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
                header: 'Từ chối duyệt ' + this.selectedItems.length + ' hóa đơn',
                //subHeader: '---',
                message: 'Bạn chắc muốn từ chối duyệt ' + this.selectedItems.length + ' hóa đơn đang chọn?',
                buttons: [
                    {
                        text: 'Không',
                        role: 'cancel',
                        handler: () => {
                            //console.log('Không xóa');
                        }
                    },
                    {
                        text: 'Từ chối',
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

        let itemsCanNotProcess = this.selectedItems.filter(i => (i.Status == 'EInvoiceNew' || i.Status == 'EInvoiceRelease' || i.Status == 'EInvoiceCancel' || i.Status == 'ARInvoiceApproved' || i.Status == 'ARInvoicePending' || i.Status == 'ARInvoiceCanceled' || i.Status == 'ARInvoiceSplited' || i.Status == 'ARInvoiceMerged'));
        if (itemsCanNotProcess.length == this.selectedItems.length) {
            this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.can-not-cancel-pending-draft-only', 'warning');
        }
        else {
            itemsCanNotProcess.forEach(i => {
                i.checked = false;
            });
            this.selectedItems = this.selectedItems.filter(i => (i.Status == 'ARInvoiceNew' || i.Status == 'ARInvoiceDraft' || i.Status == 'ARInvoicePending' || i.Status == 'ARInvoiceRejected'));

            this.alertCtrl.create({
                header: 'HỦY ' + this.selectedItems.length + ' hóa đơn',
                //subHeader: '---',
                message: 'Bạn chắc muốn HỦY ' + this.selectedItems.length + ' hóa đơn đang chọn?',
                buttons: [
                    {
                        text: 'Không',
                        role: 'cancel',
                        handler: () => {
                            //console.log('Không xóa');
                        }
                    },
                    {
                        text: 'Hủy',
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
                header: 'Gửi duyệt ' + this.selectedItems.length + ' hóa đơn',
                //subHeader: '---',
                message: 'Bạn chắc muốn gửi duyệt ' + this.selectedItems.length + ' hóa đơn đang chọn?',
                buttons: [
                    {
                        text: 'Không',
                        role: 'cancel',
                        handler: () => {
                            //console.log('Không xóa');
                        }
                    },
                    {
                        text: 'Gửi',
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
                header: 'Có ' + itemsCanNotDelete.length + ' hóa đơn không thể xóa',
                //subHeader: '---',
                message: 'Bạn có muốn bỏ qua ' + this.selectedItems.length + ' hóa đơn này và tiếp tục xóa?',
                buttons: [
                    {
                        text: 'Không',
                        role: 'cancel',
                        handler: () => {
                            //console.log('Không xóa');
                        }
                    },
                    {
                        text: 'Đồng ý tiếp tục',
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
                header: 'Xuất hóa đơn điện tử',
                //subHeader: '---',
                message: 'Bạn chưa chọn hoá đơn nào, bạn có muốn hệ thống tự tạo hóa đơn gộp và xuất HĐĐT cho các KHÁCH HÀNG KHÔNG LẤY HÓA ĐƠN hay không?',
                buttons: [
                    {
                        text: 'Không',
                        role: 'cancel',
                        handler: () => {

                        }
                    },
                    {
                        text: 'Đồng ý',
                        cssClass: 'success-btn',
                        handler: () => {
                            this.EInvoiceService.AutoMergeARAndCreateEInvoice()
                                .then((resp: any) => {
                                    if (resp == 'empty') {
                                        this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.issue-einvoice-message-empty', 'warning');      
                                    }
                                    else if (resp == '') {
                                        this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.issue-einvoice-message-success', 'success');      
                                    }
                                    else{
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

                let IsSubmitAllBPEInvoice = true;
                let hasConfigValue = false;
                let branch: any;
                branch = this.env.branchList.filter(f => f.Id == this.env.selectedBranch);

                for (let index = 0; index < 10; index++) {
                    this.sysConfigProvider.search({ Code: 'IsSubmitAllBPEInvoice', IDBranch: branch[0].Id }).toPromise().then((response: any) => {

                        if (response.length > 0 && !hasConfigValue) {
                            IsSubmitAllBPEInvoice = response[0].Value;
                            hasConfigValue = true;
                            index = 10;
                        }
                    }).finally(() => {

                        if (branch.length == 0) {
                            index = 10;
                        }
                        else {
                            branch = this.env.branchList.filter(f => f.Id == branch[0].IDParent);
                        }
                    })


                }


                let ids = [];
                for (let index = 0; index < this.selectedItems.length; index++) {
                    const item = this.selectedItems[index];
                    if (item.BuyerTaxCode == null || (item.BuyerUnitName == null && item.BuyerName == null) || item.BuyerAddress == null) {
                        ids.push(item.Id);
                    }
                }

                if (!IsSubmitAllBPEInvoice && ids.length > 0) {
                    this.env.showMessage('Các hóa đơn #(' + ids.join(",") + ') không có thông tin xuất hóa đơn. Vui lòng kiểm tra lại!', 'warning');
                    return;
                }

                let latestInvoiceDate = new Date();
                this.EInvoiceService.GetLatestEInvoice()
                    .then((resp: any) => {
                        latestInvoiceDate = resp.InvoiceDate;

                    }).finally(() => {
                        let arLowerDate = [];
                        let arLowerDateIds = []
                        for (let index = 0; index < this.selectedItems.length; index++) {
                            let ar = this.selectedItems[index];
                            if (ar.InvoiceDate < latestInvoiceDate) {
                                arLowerDate.push(ar);
                                arLowerDateIds.push(ar.Id);
                            }
                        }

                        if (arLowerDateIds.length > 0) {

                            this.alertCtrl.create({
                                header: 'Xuất hóa đơn điện tử',
                                //subHeader: '---',
                                message: 'Các hóa đơn số #(' + arLowerDateIds.toString() + ') có ngày xuất hóa đơn nhỏ hơn ngày xuất HĐĐT gần nhất(' + latestInvoiceDate + '). Bạn có muốn cập nhật ngày hóa đơn đến ngày gần nhất?',
                                buttons: [
                                    {
                                        text: 'Không',
                                        role: 'cancel',
                                        handler: () => {
                                            //this.selectedItems = this.selectedItems.filter(i => (i.Status == 'ARInvoiceApproved'));
                                        }
                                    },
                                    {
                                        text: 'Cập nhật',
                                        cssClass: 'success-btn',
                                        handler: () => {
                                            for (let index = 0; index < arLowerDateIds.length; index++) {
                                                const ar = arLowerDate[index];
                                                ar.InvoiceDate = latestInvoiceDate;
                                                this.pageProvider.save(ar);
                                            }
                                            this.env.showMessage('Đã cập nhật ngày hóa đơn thành công!', 'success');
                                            this.submitAttempt = false;
                                            this.showCreateEInvoicePopup();
                                        }
                                    }
                                ]
                            }).then(alert => {
                                alert.present();
                            })
                        }
                        else {
                            this.showCreateEInvoicePopup();
                        }

                    })
                    .catch(err => {
                        console.log(err);

                    })
            }
        }
    }

    updateEInvoice() {
        if (!this.pageConfig.canCreateEInvoice) {
            return;
        }

        let itemsCanNotProcess = this.selectedItems.filter(i => (i.Status != 'EInvoiceNew'));
        if (itemsCanNotProcess.length == this.selectedItems.length) {
            this.env.showMessage('Không thể cập nhật. Vui lòng chỉ chọn các hóa đơn đã tạo hóa đơn điện tử.', 'warning')
        }
        else {
            itemsCanNotProcess.forEach(i => {
                i.checked = false;
            });

            this.selectedItems = this.selectedItems.filter(i => (i.Status == 'EInvoiceNew'));

            this.alertCtrl.create({
                header: 'Cập nhật hóa đơn điện tử',
                //subHeader: '---',
                message: 'Bạn chắc muốn cập nhật hóa đơn điện tử cho các hóa đơn này?',
                buttons: [
                    {
                        text: 'Không',
                        role: 'cancel',
                        handler: () => {
                            //this.selectedItems = this.selectedItems.filter(i => (i.Status == 'ARInvoiceApproved'));
                        }
                    },
                    {
                        text: 'Cập nhật',
                        cssClass: 'success-btn',
                        handler: () => {
                            this.selectedItems.forEach(i => {
                                this.EInvoiceService.UpdateEInvoice(i.Id, i.InvoiceGUID, i.IDBranch)
                                    .then((resp: any) => {
                                        if (resp != '') {
                                            this.env.showMessage(resp, 'warning');
                                            this.submitAttempt = false;
                                        }
                                        else {

                                            this.env.showMessage('Đã cập nhật hóa đơn điện tử thành công!', 'success');
                                            this.submitAttempt = false;
                                        }
                                    })
                                    .catch(err => {
                                        console.log(err);

                                    })
                            })
                        }
                    }
                ]
            }).then(alert => {
                alert.present();
            })

        }
    }

    syncEInvoice() {
        if (!this.pageConfig.canCreateEInvoice) {
            return;
        }

        let itemsCanNotProcess = this.selectedItems.filter(i => (i.Status == 'EInvoiceRelease' || i.Status == 'EInvoiceCancel' || i.Status == 'ARInvoiceApproved' || i.Status == 'ARInvoicePending' || i.Status == 'ARInvoiceCanceled' || i.Status == 'ARInvoiceSplited' || i.Status == 'ARInvoiceMerged'));
        if (itemsCanNotProcess.length == this.selectedItems.length) {
            this.env.showMessage('Không thể đồng bộ dữ liệu với Ehoadon. Vui lòng chỉ chọn các hóa đơn đã tạo hóa đơn điện tử.', 'warning')
        }
        else {
            itemsCanNotProcess.forEach(i => {
                i.checked = false;
            });

            this.selectedItems = this.selectedItems.filter(i => (i.Status == 'EInvoiceNew' || i.Status == 'EInvoiceEmpty'));

            this.alertCtrl.create({
                header: 'Đồng bộ hóa đơn điện tử',
                //subHeader: '---',
                message: 'Bạn chắc muốn đồng bộ dữ liệu từ Ehoadon cho các hóa đơn này?',
                buttons: [
                    {
                        text: 'Không',
                        role: 'cancel',
                        handler: () => {
                            //this.selectedItems = this.selectedItems.filter(i => (i.Status == 'ARInvoiceApproved'));
                        }
                    },
                    {
                        text: 'Đồng bộ',
                        cssClass: 'success-btn',
                        handler: () => {
                            this.selectedItems.forEach(i => {
                                this.EInvoiceService.SyncEInvoice(i.InvoiceGUID, i.IDBranch)
                                    .then((resp: any) => {

                                        if (resp != '') {
                                            var json = JSON.parse(resp);
                                            this.env.showMessage(json[0].MessLog, 'warning');
                                            this.submitAttempt = false;
                                        }
                                        else {

                                            this.env.showMessage('Đã đồng bộ dữ liệu thành công!', 'success');
                                            this.submitAttempt = false;

                                            this.refresh();
                                        }
                                    })
                                    .catch(err => {
                                        console.log(err);

                                    })
                            })
                        }
                    }
                ]
            }).then(alert => {
                alert.present();
            })

        }
    }

    showCreateEInvoicePopup() {
        this.alertCtrl.create({
            header: 'Xuất hóa đơn điện tử',
            //subHeader: '---',
            message: 'Bạn chắc muốn xác nhận xuất hóa đơn điện tử cho các hóa đơn này?',
            buttons: [
                {
                    text: 'Không',
                    role: 'cancel',
                    handler: () => {
                        //console.log('Không xóa');
                    }
                },
                {
                    text: 'Xuất',
                    cssClass: 'success-btn',
                    handler: () => {

                        if (this.submitAttempt == false) {
                            this.submitAttempt = true;

                            this.selectedItems.forEach(i => {
                                this.EInvoiceService.CreateEInvoice(i.Id, i.IDBranch)
                                    .then((resp: any) => {
                                        
                                        var json = JSON.parse(resp);

                                        if (json.MessLog != '') {
                                            this.env.showMessage(json.MessLog, 'warning');
                                            this.submitAttempt = false;
                                        }
                                        else {
                                            i.InvoiceNo = json.InvoiceNo;
                                            i.InvoiceGUID = json.InvoiceGUID;
                                            //i.OriginalInvoiceIdentify = json[0].OriginalInvoiceIdentify;
                                            i.InvoiceCode = json.MTC;
                                            //i.InvoiceDate = new Date();
                                            i.Status = 'EInvoiceNew';
                                            i._Status = this.statusList.find(d => d.Code == 'EInvoiceNew');

                                            //this.pageProvider.save(i);

                                            this.env.showMessage('Đã xuất hóa đơn điện tử thành công!', 'success');
                                            this.submitAttempt = false;
                                            this.refresh();
                                        }
                                    })
                                    .catch(err => {
                                        console.log(err);

                                    })
                            })

                        }

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
        //     this.env.showMessage('Có nhiều hơn 1 hóa đơn đã tạo HĐĐT, xin vui lòng kiểm tra lại!', 'warning')
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
