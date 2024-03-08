
import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { BANK_IncomingPaymentDetailProvider, BANK_IncomingPaymentProvider, BRA_BranchProvider, CRM_ContactProvider,  } from 'src/app/services/static/services.service';
import { FormBuilder, FormControl, FormArray, Validators } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { IncomingPaymentSaleOrderModalPage } from '../incoming-payment-sale-order-modal/incoming-payment-sale-order-modal.page';


@Component({
    selector: 'app-incoming-payment-detail',
    templateUrl: './incoming-payment-detail.page.html',
    styleUrls: ['./incoming-payment-detail.page.scss'],
})
export class IncomingPaymentDetailPage extends PageBase {
    statusList: [];
    SelectedOrderList = [];
    constructor(
        public pageProvider: BANK_IncomingPaymentProvider,
        public incomingPaymentDetailService: BANK_IncomingPaymentDetailProvider,
        public branchProvider: BRA_BranchProvider,
        public env: EnvService,
        public navCtrl: NavController,
        public route: ActivatedRoute,
        public modalController: ModalController,
        public contactProvider: CRM_ContactProvider,
        public alertCtrl: AlertController,
        public formBuilder: FormBuilder,
        public cdr: ChangeDetectorRef,
        public loadingController: LoadingController,
        public commonService: CommonService,
    ) {
        super();
        this.pageConfig.isDetailPage = true;
        this.pageConfig.canEdit = true;
        this.formGroup = formBuilder.group({
            IDBranch: [this.env.selectedBranch],
            Id: new FormControl({ value: '', disabled: true }),
            Name: [''],
            Code: [''],
            DocumentDate: [''],
            Type: ['Cash', Validators.required],
            SubType: [''],
            Remark: [''],
            Amount: ['', Validators.required],
            Status: new FormControl({ value: 'Success', disabled: true }),
            IDCustomer: [''],
            InComingPaymentDetails: this.formBuilder.array([]),
            IsDisabled: new FormControl({ value: '', disabled: true }),
            IsDeleted: new FormControl({ value: '', disabled: true }),
            CreatedBy: new FormControl({ value: '', disabled: true }),
            CreatedDate: new FormControl({ value: '', disabled: true }),
            ModifiedBy: new FormControl({ value: '', disabled: false }),
            ModifiedDate: new FormControl({ value: '', disabled: false }),
        });
    }

    
    segmentView = 's1';
    segmentChanged(ev: any) {
        this.segmentView = ev.detail.value;
    }

    async saveChange() {
        let groups = <FormArray>this.formGroup.controls.InComingPaymentDetails;
        if(groups.controls.length > 0) {
            this.formGroup.get('Type').markAsDirty();
            this.formGroup.get('Status').markAsDirty();
            super.saveChange2();
        }else {
            this.env.showTranslateMessage('Please select at least 1 order','warning');
        }
       
    }

    typeDataSource: any;
    preLoadData(event?: any): void {
        Promise.all([
            this.env.getStatus('PaymentStatus'),
            this.env.getType('PaymentType')

        ]).then((values:any) => {
            if(values.length){
                this.statusList = values[0].filter(d => d.Code != 'PaymentStatus');
                this.typeDataSource = values[1].filter(d => d.Code == 'Cash' || d.Code == 'Card' || d.Code == 'Transfer')
            }
            super.preLoadData(event);
        })

    }

    loadedData(event?: any, ignoredFromGroup?: boolean): void {
        if (this.item?.Status == 'Success') {
            this.pageConfig.canEdit = false;
        }
        super.loadedData(event, ignoredFromGroup);
        this.query.IDIncomingPayment = this.item.Id;
        this.query.Id = undefined;
        this.incomingPaymentDetailService.read(this.query,false).then((listIPDetail:any) =>{
            if(listIPDetail!= null && listIPDetail.data.length>0){
                const incomingPaymentDetailsArray = this.formGroup.get('InComingPaymentDetails') as FormArray;
                incomingPaymentDetailsArray.clear();
                this.item.InComingPaymentDetails = listIPDetail.data;
                this.patchFieldsValue();
            }
        });
        this._contactDataSource.initSearch();
    }

    sortDetail: any = {};
    sortToggle(field) {
        if (!this.sortDetail[field]) {
            this.sortDetail[field] = field
        } else if (this.sortDetail[field] == field) {
            this.sortDetail[field] = field + '_desc'
        }
        else {
            delete this.sortDetail[field];
        }

        if (Object.keys(this.sortDetail).length === 0) {
            this.refresh();
        }
        else {
            this.reInitIncomingPaymentCountDetails();
        }
    }

    reInitIncomingPaymentCountDetails() {
        const inComingPaymentDetailsArray = this.formGroup.get('InComingPaymentDetails') as FormArray;
        this.item.InComingPaymentDetails = inComingPaymentDetailsArray.getRawValue();
        for (const key in this.sortDetail) {
            if (this.sortDetail.hasOwnProperty(key)) {
                const value = this.sortDetail[key];
                this.sortByKey(value);
            }
        }
        inComingPaymentDetailsArray.clear();
        this.item.InComingPaymentDetails.forEach(s => this.addField(s));
    }

    sortByKey(key: string, desc: boolean = false) {
        if (key.includes('_desc')) {
            key = key.replace('_desc', '');
            desc = true;
        }
        this.item.InComingPaymentDetails.sort((a, b) => {
            const comparison = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
            return desc ? -comparison : comparison;
        });

    }

    private patchFieldsValue() {
        this.pageConfig.showSpinner = true;
        this.formGroup.controls.InComingPaymentDetails = new FormArray([]);
        if (this.item.InComingPaymentDetails?.length) {
            this.item.InComingPaymentDetails.forEach(i => this.addField(i));
        }
        this.pageConfig.showSpinner = false;
    }

    addField(field: any, markAsDirty = false) {
        let groups = <FormArray>this.formGroup.controls.InComingPaymentDetails;
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
        group.get('IDIncomingPayment').markAsDirty();
        group.get('Id').markAsDirty();
        group.get('IDSaleOrder').markAsDirty();
        group.get('IDCustomer').markAsDirty();
        group.get('IDInvoice').markAsDirty();
        group.get('Name').markAsDirty();
        group.get('Remark').markAsDirty();
        group.get('Amount').markAsDirty();
        this.formGroup.get('InComingPaymentDetails').markAsDirty();

    }

    changeType(e) {
        this.formGroup.get('Type').setValue(e.Code);
        this.formGroup.get('Type').markAsDirty();
        this.saveChange();
    }

    async showOrderModal() {
        let groups = <FormArray>this.formGroup.controls.InComingPaymentDetails;
        const modal = await this.modalController.create({
          component: IncomingPaymentSaleOrderModalPage,
          componentProps: {
            //id: this.item.Id,
            Id_ne: groups.getRawValue().map(o => o.IDSaleOrder)
            
          },
          cssClass: 'modal90',
        });
    
        await modal.present();
        const { data } = await modal.onWillDismiss();
    
        if (data && data.length) {
          for (let i = 0; i < data.length; i++) {
            const e = data[i];
            if (this.SelectedOrderList.findIndex((d) => d.IDSaleOrder == e.IDSaleOrder) == -1) {
              this.SelectedOrderList.push(e);
            }
          }
        }
        this.SelectedOrderList.forEach(i => this.addField(i));
        console.log(this.formGroup);
        if(this.formGroup.valid){
            this.saveChange();
        }

      }

    
    
    _contactDataSource = {
        searchProvider: this.contactProvider,
        loading: false,
        input$: new Subject<string>(),
        selected: [],
        items$: null,
        id: this.id,
        initSearch() {
            this.loading = false;
            this.items$ = concat(
                of(this.selected),
                this.input$.pipe(
                    distinctUntilChanged(),
                    tap(() => this.loading = true),
                    switchMap(term => this.searchProvider.search({SkipMCP: term ? false : true, SortBy: ['Id_desc'], Take: 20, Skip: 0, Term: term ? term : 'BP:' + this.item?.IDCustomer}).pipe(
                        catchError(() => of([])), // empty list on error
                        tap(() => this.loading = false)
                    ))

                )
            );
        }
    };
    
}
