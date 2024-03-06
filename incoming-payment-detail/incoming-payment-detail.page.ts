import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { BANK_IncomingPaymentProvider, BRA_BranchProvider,  } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
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
            IsDisabled: new FormControl({ value: '', disabled: true }),
            IsDeleted: new FormControl({ value: '', disabled: true }),
            CreatedBy: new FormControl({ value: '', disabled: true }),
            CreatedDate: new FormControl({ value: '', disabled: true }),
            ModifiedBy: new FormControl({ value: '', disabled: true }),
            ModifiedDate: new FormControl({ value: '', disabled: true }),
        });
    }

    segmentView = 's1';
    segmentChanged(ev: any) {
        this.segmentView = ev.detail.value;
    }

    async saveChange() {
        super.saveChange2();
    }

    preLoadData(event?: any): void {
        Promise.all([
            this.env.getStatus('PaymentStatus'),

        ]).then((values:any) => {
            if(values.length){
                this.statusList = values[0].filter(d => d.Code != 'PaymentStatus');
            }
            
            super.preLoadData(event);
        })

    }
}
