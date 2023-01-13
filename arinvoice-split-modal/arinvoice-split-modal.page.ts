import { Component, ChangeDetectorRef, Input } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { CRM_ContactProvider, AC_ARInvoiceDetailProvider, AC_ARInvoiceProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray } from '@angular/forms';
import { NgSelectConfig } from '@ng-select/ng-select';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';


    
@Component({
    selector: 'app-arinvoice-split-modal',
    templateUrl: './arinvoice-split-modal.page.html',
    styleUrls: ['./arinvoice-split-modal.page.scss'],
})
export class ARInvoiceSplitModalPage extends PageBase {
    @Input() selectedInvoice;
    initContactsIds = [];

    isPromotionRegistered = false;
    showPromoInvoice = true;
    showDiscountInvoice = true;

    constructor(
        public pageProvider: AC_ARInvoiceProvider,
        public ARInvoiceDetailProvider: AC_ARInvoiceDetailProvider,
        public contactProvider: CRM_ContactProvider,
        public itemProvider: WMS_ItemProvider,

        public env: EnvService,
        public navCtrl: NavController,
        public route: ActivatedRoute,

        public modalController: ModalController,
        public alertCtrl: AlertController,
        public navParams: NavParams,
        public formBuilder: FormBuilder,
        public cdr: ChangeDetectorRef,
        public loadingController: LoadingController,
        private config: NgSelectConfig
    ) {
        super();
        this.pageConfig.isDetailPage = false;
        this.pageConfig.pageName = 'Tách hóa đơn';
        this.config.notFoundText = 'Không tìm thấy dữ liệu phù hợp...';
        this.config.clearAllText = 'Xóa hết';
    }



    loadData(event) {
        this.item = { IDARInvoice: this.selectedInvoice.Id, SplitedARInvoices: [], IDBusinessPartner: this.selectedInvoice.IDBusinessPartner, IDContact: this.selectedInvoice.IDBusinessPartner };
        
        this.item.SplitedARInvoices.push({
            isFirst: true,
            visible: true,
            InvoiceType: 'normal',
            Title: 'Hóa đơn cho khách hàng',
            IDBusinessPartner: this.selectedInvoice.IDBusinessPartner,
            //ContactName: this.selectedInvoice.CustomerName,
            BuyerName: this.selectedInvoice.CustomerName,
            BuyerTaxCode: this.selectedInvoice.BuyerTaxCode,
            BuyerUnitName: this.selectedInvoice.BuyerUnitName,
            Currency: this.selectedInvoice.Currency,
            ExchangeRate: this.selectedInvoice.ExchangeRate,
            ReceiverAddress: this.selectedInvoice.ReceiverAddress,
            ReceiverEmail: this.selectedInvoice.ReceiverEmail,
            ReceiverMobile: this.selectedInvoice.ReceiverMobile,
            ReceiverName: this.selectedInvoice.ReceiverName,
            ReceiveType: this.selectedInvoice.ReceiveType,
            Type: 'InvoiceTypeVAT',
            Status: 'ARInvoiceNew'
        });
        this.item.SplitedARInvoices.push({
            isFirst: false,
            visible: true,
            InvoiceType: 'claimdiscount',
            Title: 'Hóa đơn thu tiền chiết khấu cho NCC',
            IDBusinessPartner: null,
            //ContactName: this.selectedInvoice.CustomerName,
            BuyerName: null,
            BuyerTaxCode: null,
            BuyerUnitName: null,
            Currency: null,
            ExchangeRate: null,
            ReceiverAddress: null,
            ReceiverEmail: null,
            ReceiverMobile: null,
            ReceiverName: null,
            ReceiveType: null,
            Type: 'InvoiceTypeVAT',
            Status: 'ARInvoiceNew'
        });
        this.item.SplitedARInvoices.push({
            isFirst: false,
            visible: false,
            InvoiceType: 'claimcash',
            Title: 'Hóa đơn thu tiền hàng tặng cho NCC',
            IDBusinessPartner: null,
            //ContactName: this.selectedInvoice.CustomerName,
            BuyerName: null,
            BuyerTaxCode: null,
            BuyerUnitName: null,
            Currency: null,
            ExchangeRate: null,
            ReceiverAddress: null,
            ReceiverEmail: null,
            ReceiverMobile: null,
            ReceiverName: null,
            ReceiveType: null,
            Type: 'InvoiceTypeVAT',
            Status: 'ARInvoiceNew'
        });
        this.item.SplitedARInvoices.push({
            isFirst: false,
            visible: true,
            InvoiceType: 'claimitem',
            Title: 'Hóa đơn nhận hàng tặng cho NCC',
            BuyerName: null,
            IDBusinessPartner: null,
            BuyerTaxCode: null,
            BuyerUnitName: null,
            Currency: null,
            ExchangeRate: null,
            ReceiverAddress: null,
            ReceiverEmail: null,
            ReceiverMobile: null,
            ReceiverName: null,
            ReceiveType: null,
            Type: 'InvoiceTypeVAT',
            Status: 'ARInvoiceNew'
            
        });
        
        this.contactListSelected.push({
            Id: this.selectedInvoice.IDBusinessPartner,
            Name: this.selectedInvoice.BuyerName,
            WorkPhone: this.selectedInvoice.ReceiverMobile,
            AddressLine1: this.selectedInvoice.BuyerAddress
        });
        
        //check xem SO này là SO con hay không
        // console.log(this.selectedInvoice);
        
        // let queryOption = {IDOrder: this.selectedInvoice.Id, IDParent: 0};
        // if(this.selectedInvoice.IDParent && this.selectedInvoice.IDParent != 0)
        // {
        //     //queryOption = {IDOrder: this.selectedInvoice.IDParent, IDParent: this.selectedInvoice.IDParent};
            
        // }

        this.ARInvoiceDetailProvider.read({IDARInvoice: this.selectedInvoice.Id}).then((result: any) => {
            
            this.items = result.data;

            let normalItems = this.items;
            let promoItems = [];
            let discountItems = [];
            
            for (let i = 0; i < this.items.length; i++) {
                let item = this.items[i];

                if (item.TotalDiscount != 0) {
                    discountItems.push(item)
                }

                if(item.IsPromotionItem){
                    promoItems.push(item)
                }
            }

            //ar cho khách hàng
            if(normalItems != undefined){
                this.item.SplitedARInvoices[0].InvoiceLines = JSON.parse(JSON.stringify(normalItems));}
            else{ 
                let line = this.item.SplitedARInvoices.find(i=>{i.InvoiceType == 'normal'})
                this.item.SplitedARInvoices.splice(this.item.SplitedARInvoices.indexOf(line),1); 
            }
            
            //ar claim tiền chiết khấu từ NCC
            if(this.selectedInvoice.TotalDiscount > 0){
                
    
                let newItem = [{
                                IDOrder: this.selectedInvoice.IDSaleOrder,
                                IDItem: 9598,
                                Quantity: 1,
                                UoMPrice: this.selectedInvoice.TotalDiscount,
                                IDUoM: 10884,
                                TotalAfterTax: this.selectedInvoice.TotalDiscount + this.selectedInvoice.TotalDiscount*0.1,
                                TaxRate: 10,
                                Tax: this.selectedInvoice.TotalDiscount*0.1
                                }];
                
                this.item.SplitedARInvoices[1].InvoiceLines = JSON.parse(JSON.stringify(newItem));
            }
            else{ 
                let line = this.item.SplitedARInvoices.find(i=>{i.InvoiceType == 'claimdiscount'})
                this.item.SplitedARInvoices.splice(this.item.SplitedARInvoices.indexOf(line),1); 
            }
            
            //ar claim sản phẩm tặng hoặc tiền tương đương sản phẩm tặng từ NCC
            if(promoItems != undefined){
                //case nhận tiền
                let totalDiscount = 0;
                for (let index = 0; index < promoItems.length; index++) {
                    let i = promoItems[index];
                    
                    totalDiscount += i.TotalDiscount;
                }
    
                let newItem = [{
                                IDOrder: this.selectedInvoice.IDSaleOrder,
                                Id: 9598,
                                Quantity: 1,
                                IDUoM: 10884,
                                UoMPrice: totalDiscount,
                                TotalAfterTax: totalDiscount + totalDiscount*0.1,
                                TaxRate: 10,
                                Tax: totalDiscount*0.1
                                }]
                this.item.SplitedARInvoices[2].InvoiceLines = JSON.parse(JSON.stringify(newItem));

                //case nhận hàng
                this.item.SplitedARInvoices[3].InvoiceLines = JSON.parse(JSON.stringify(promoItems));
            }
            else{ 
                let line = this.item.SplitedARInvoices.find(i=>{i.InvoiceType == 'claimitem'})
                this.item.SplitedARInvoices.splice(this.item.SplitedARInvoices.indexOf(line),1); 

                let line1 = this.item.SplitedARInvoices.find(i=>{i.InvoiceType == 'claimdiscount'})
                this.item.SplitedARInvoices.splice(this.item.SplitedARInvoices.indexOf(line1),1); 
            }

            this.loadedData(event);
            
            // let ids = this.items.map(i => i.IDItem);
            // if (ids.length) {
            //     this.itemProvider.search({ IgnoredBranch: true, Id: JSON.stringify(ids) }).toPromise().then((result: any) => {
            //         result.forEach(i => {
            //             if (this.itemListSelected.findIndex(d => d.Id == i.Id) == -1) {
            //                 this.itemListSelected.push(i);
            //             }
            //             let lines = this.items.filter(d => d.IDItem == i.Id);
            //             lines.forEach(line => {
            //                 line._itemData = i;
            //             });
            //         });
            //     }).finally(() => {
            //         this.itemSearch();
            //     });
            // }
            // else {
            //     this.itemSearch();
            // }

        });


    }

    loadedData(event) {
        this.contactSearch();
        super.loadedData(event);
    }

    contactList$
    contactListLoading = false;
    contactListInput$ = new Subject<string>();
    contactListSelected = [];
    contactSelected = null;
    contactSearch() {        
        
        this.contactListLoading = false;
        this.contactList$ = concat(
            of(this.contactListSelected),
            this.contactListInput$.pipe(
                distinctUntilChanged(),
                tap(() => this.contactListLoading = true),
                switchMap(term => this.contactProvider.search({ Take: 20, Skip: 0, Term: term ? term : this.item.IDContact }).pipe(
                    catchError(() => of([])), // empty list on error
                    tap(() => this.contactListLoading = false)
                ))

            )
        );
        
    }

    itemList$
    itemListLoading = false;
    itemListInput$ = new Subject<string>();
    itemListSelected = [];

    itemSearch() {
        this.itemListLoading = false;
        this.itemList$ = concat(
            of(this.itemListSelected),
            this.itemListInput$.pipe(
                distinctUntilChanged(),
                tap(() => this.itemListLoading = true),
                switchMap(term => this.itemProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
                    catchError(() => of([])), // empty list on error
                    tap(() => this.itemListLoading = false)
                ))

            )
        );
    }

    changedIDBusinessPartner(i, o) {
        if (i) {
            this.contactSelected = i;
            if (this.contactListSelected.findIndex(d => d.Id == i.Id) == -1) {
                this.contactListSelected.push(i);
                this.contactSearch();
            }

            o.IDBusinessPartner = i.Id;
            o.BuyerName = i.Name;
            o.BuyerUnitName = i.Name;
            o.ReceiverName = i.Name;
            o.BuyerAddress = i.AddressLine1;
            o.ReceiverMobile = i.WorkPhone;
        }
        this.checkValid();
    }

    segmentView = 's1';
    segmentChanged(ev: any) {
        this.segmentView = ev.detail.value;
    }

    addSplitedInvoice() {
        this.item.SplitedARInvoices.push({
            IDBusinessPartner: null,
            InvoiceLines: JSON.parse(JSON.stringify(this.items))
        });
        this.calcInvoices();
        this.checkValid();
    }

    removeSplitedInvoice(o) {
        const index = this.item.SplitedARInvoices.indexOf(o);
        if (index > -1) {
            this.item.SplitedARInvoices.splice(index, 1);
        }
        this.calcInvoices();
        this.checkValid();
    }

    calcInvoices() {
        this.items.forEach(i => {
            i.splitDetail = [];
            for (let j = 0; j < this.item.SplitedARInvoices.length; j++) {
                const o = this.item.SplitedARInvoices[j];
                i.splitDetail.push(o.InvoiceLines.find(d => d.Id == i.Id));
            }
        });

        this.items.forEach(i => {
            let Order = i.splitDetail[0];
            let props = ['Quantity'];
            props.forEach(prop => {
                this.checkOriginal(i, Order, prop);
            });
            
        });
    }

    changeClaimType(e){
        this.item.SplitedARInvoices[2].visible = e.target.checked;
        this.item.SplitedARInvoices[3].visible = !e.target.checked;
    }

    changedCalc(originalRow, editingRow, prop) {
        let maxValue = originalRow[prop];
        let cValue = editingRow[prop];
        if (cValue > maxValue) {
            editingRow[prop] = maxValue;
            cValue = maxValue;
        }
        if(editingRow['Quantity'] == originalRow['Quantity']){
            let props = ['Quantity'];
            props.forEach(prop => {
                editingRow[prop] = originalRow[prop];
            });
        }

        this.calcOrderLine(editingRow);

        this.items.forEach(i => {
            let Order = i.splitDetail[0];
            let props = ['Quantity'];
            props.forEach(prop => {
                this.checkOriginal(i, Order, prop);
            });
            
        });
        this.checkValid();
    }

    checkOriginal(originalRow, editingRow, prop){
        let maxValue = originalRow[prop];
        let cValue = editingRow[prop];
        if (cValue > maxValue) {
            editingRow[prop] = maxValue;
            cValue = maxValue;
        }

        

        this.calcOrderLine(editingRow);

        let remain = maxValue - cValue;

        let ortherInvoice = originalRow.splitDetail.filter(d => d != editingRow);

        for (let i = 0; i < ortherInvoice.length; i++) {
            const OrderLine = ortherInvoice[i];

            if (i == ortherInvoice.length - 1) {
                OrderLine[prop] = remain;
            }

            if (remain - OrderLine[prop] <= 0) {
                OrderLine[prop] = remain;
            }

            remain = remain - OrderLine[prop];
            this.calcOrderLine(OrderLine);
            
        }

        
    }

    isCanSplit = false;
    checkValid(){
        this.isCanSplit = true;

        for (let i = 0; i < this.item.SplitedARInvoices.length; i++) {
            const o = this.item.SplitedARInvoices[i];
            if (!o.IDBusinessPartner && o.visible) {
                this.isCanSplit = false;
                break;
            }

            let totalQty = 0;
            for (let j = 0; j < o.InvoiceLines.length; j++) {
                const l = o.InvoiceLines[j];
                totalQty+= l.Quantity;
            }
            if (totalQty==0) {
                this.isCanSplit = false;
                break;
            }
        }
    }

    calcOrderLine(line) {
        line.UoMPrice = line.IsPromotionItem ? 0 : parseInt(line.UoMPrice) || 0;
        line.BuyPrice = parseInt(line.BuyPrice) || 0;

        line.Quantity = parseInt(line.Quantity) || 0;
        
    }

    splitARInvoice() {
        let publishEventCode = this.pageConfig.pageName;
        let apiPath = {
            method: "POST",
            url: function () { return ApiSetting.apiDomain("AC/ARInvoice/SplitARInvoice/") }
        };

        return new Promise((resolve, reject) => {
            if (!this.isCanSplit) {
                this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.check-customer-vendor-name','warning');
            }
            else if (this.submitAttempt == false) {
                this.submitAttempt = true;


                if (!this.item.IDBranch) {
                    this.item.IDBranch = this.env.selectedBranch;
                }

                if (!this.item.CreatedBy) {
                    this.item.CreatedBy = this.env.user.UserName;
                }
                
                this.pageProvider.commonService.connect(apiPath.method, apiPath.url(), this.item).toPromise()
                    .then((savedItem: any) => {
                        if (publishEventCode) {
                            this.env.publishEvent({ Code: publishEventCode });
                        }
                        this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.split-complete','success');
                        resolve(true);
                        this.submitAttempt = false;
                        this.closeModal();

                    }).catch(err => {
                        this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.can-not-split-try','danger');
                        this.cdr?.detectChanges();
                        this.submitAttempt = false;
                        reject(err);
                    });
            }
        });

    }


}
