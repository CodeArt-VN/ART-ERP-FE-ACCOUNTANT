import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { BANK_IncomingPaymentDetailProvider, BANK_IncomingPaymentProvider, BRA_BranchProvider,  } from 'src/app/services/static/services.service';
import { FormBuilder, FormControl, FormArray } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';

@Component({
    selector: 'app-incoming-payment-detail',
    templateUrl: './incoming-payment-detail.page.html',
    styleUrls: ['./incoming-payment-detail.page.scss'],
})
export class IncomingPaymentDetailPage extends PageBase {
    statusList: [];
    constructor(
        public pageProvider: BANK_IncomingPaymentProvider,
        public incomingPaymentDetailService: BANK_IncomingPaymentDetailProvider,
        public branchProvider: BRA_BranchProvider,
        public env: EnvService,
        public navCtrl: NavController,
        public route: ActivatedRoute,
        public alertCtrl: AlertController,
        public formBuilder: FormBuilder,
        public cdr: ChangeDetectorRef,
        public loadingController: LoadingController,
        public commonService: CommonService,
    ) {
        super();
        this.pageConfig.isDetailPage = true;

        this.formGroup = formBuilder.group({
            IDBranch: [this.env.selectedBranch],
            Id: new FormControl({ value: '', disabled: true }),
            DocumentDate: [''],
            Type: [''],
            SubType: [''],
            Remark: [''],
            Amount: [''],
            Status: [''],
            Sort: [''],
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
        super.saveChange2();
    }

    typeDataSource: any;
    preLoadData(event?: any): void {
        this.typeDataSource = [
            { Name: 'Cash', Code: 'Cash' },
            { Name: 'Card', Code: 'Card' },
            { Name: 'Transfer', Code: 'Transfer' },
        ];
        Promise.all([
            this.env.getStatus('PaymentStatus'),

        ]).then((values:any) => {
            if(values.length){
                this.statusList = values[0].filter(d => d.Code != 'PaymentStatus');
            }
            
            super.preLoadData(event);
        })

    }

    loadedData(event?: any, ignoredFromGroup?: boolean): void {
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
        })
     
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
            Id: new FormControl({ value: field.Id, disabled: true }),
            IDSaleOrder: new FormControl({ value: field.IDSaleOrder, disabled: true }),
            IDCustomer: new FormControl({ value: field.IDCustomer, disabled: true }),
            IDInvoice: new FormControl({ value: field.IDInvoice, disabled: true }),
            Name: new FormControl({ value: field.Name, disabled: true }),
            Remark: new FormControl({ value: field.Remark, disabled: true }),
            Amount: new FormControl({ value: field.Amount, disabled: true }),
        })  
        groups.push(group);
    }

    changeType(e) {
        this.formGroup.get('Type').setValue(e.Code);
        this.formGroup.get('Type').markAsDirty();
        this.saveChange();
    }

}
