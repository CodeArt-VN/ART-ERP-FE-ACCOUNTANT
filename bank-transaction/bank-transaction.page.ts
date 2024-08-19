import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  BANK_AccountProvider,
  BANK_TransactionProvider,
  BRA_BranchProvider,
} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { SortConfig } from 'src/app/models/options-interface';
import { J } from '@fullcalendar/core/internal-common';

@Component({
  selector: 'app-bank-transaction',
  templateUrl: 'bank-transaction.page.html',
  styleUrls: ['bank-transaction.page.scss'],
})
export class BankTransactionPage extends PageBase {
  groupControl = {
    showReorder: false,
    showPopover: false,
    groupList: [],
    selectedGroup: null,
  };
  itemsState: any = [];
  isAllRowOpened = true;
  constructor(
    public pageProvider: BANK_TransactionProvider,
    public providerService: BANK_AccountProvider,
    public branchProvider: BRA_BranchProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
  ) {
    super();
    this.pageConfig.isShowFeature = true;
    this.pageConfig.isFeatureAsMain = true;
  }

  preLoadData(event?: any): void {
    let sorted: SortConfig[] = [{ Dimension: 'Id', Order: 'DESC' }];
    this.pageConfig.sort = sorted;
    this.pageConfig.pageIcon = 'flash-outline';
    this.providerService
      .read({ Take: 5000 })
      .then((res) => {
        this.groupControl.groupList = res['data'];
        this.groupControl.groupList.forEach((g) => {
          if (g.IDParent) g._query = g.Id;
          else {
            let childrentIds = this.groupControl.groupList.filter((x) => x.IDParent === g.Id).map((x) => x.Id);
            g._query = JSON.stringify(childrentIds);
          }
        });
      })
      .catch((err) => {
        this.env.showMessage(err, 'danger');
      })
      .finally(() => {
        super.preLoadData(event);
      });
  }

  onGroupChange(g) {
    this.pageConfig.isSubActive = true;
    this.groupControl.selectedGroup = g;
    if (g) {
      this.query.IDAccount = g._query;
    } else {
      delete this.query.IDAccount;
    }

    this.refresh();
  }
}
