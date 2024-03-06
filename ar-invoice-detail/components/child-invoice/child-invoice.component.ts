import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { AC_ARInvoiceProvider, SYS_ConfigProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { EInvoiceService } from 'src/app/services/einvoice.service';

@Component({
  selector: 'app-child-invoice',
  templateUrl: 'child-invoice.component.html',
  styleUrls: ['child-invoice.component.scss'],
})
export class ChildInvoiceComponent extends PageBase {
  @Input() canEdit;

  @Input() set IDParent(value) {
    this.query.IDParent = value;
    super.loadData();
    console.log(value);
  }
  @Input() set showSearch(value) {
    this.pageConfig.isShowSearch = value;
  }

  @Output() onUpdate = new EventEmitter();

  constructor(
    public pageProvider: AC_ARInvoiceProvider,
    public arInvoiceProvider: EInvoiceService,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
    public sysConfigProvider: SYS_ConfigProvider,
  ) {
    super();
  }

  loadData(event?: any): void {
    let sysConfigQuery = ['IsShowSOCode'];
    Promise.all([
      this.sysConfigProvider.read({
        Code_in: sysConfigQuery,
        IDBranch: this.env.selectedBranch,
      }),
    ]).then((values: any) => {
      values[0]['data'].forEach((e) => {
        if ((e.Value == null || e.Value == 'null') && e._InheritedConfig) {
          e.Value = e._InheritedConfig.Value;
        }
        this.pageConfig[e.Code] = JSON.parse(e.Value);
      });
    });

    this.pageConfig.canEdit = this.canEdit;
    if (this.query.IDParent) super.loadData(event);
    else super.loadedData(event);
  }

  isAllChecked = false;
  toggleSelectAll() {
    this.items.forEach((i) => (i.checked = this.isAllChecked));
  }

  addARInvoice() {
    this.env.showMessage('Add A/R invoice function will be coming soon!');
    //this.onUpdate.emit();
  }

  removeRow(row) {
    this.isAllChecked = false;
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].checked = this.isAllChecked;
    }
    row.checked = true;
    this.removeAllSelectedRows();
  }

  removeAllSelectedRows() {
    this.selectedItems = this.items.filter((d) => d.checked == true);

    if (this.selectedItems.length > 0) {
      this.env
        .showPrompt(
          'Bạn có chắc muốn gở bỏ các hóa đơn này khỏi hóa đơn gộp không? (Thao tác này không thể khôi phục, các hóa đơn gở bỏ sẽ được chuyển về trạng thái đã duyệt)',
          null,
          'Gỡ bỏ (' + this.selectedItems.length + ') hóa đơn đã chọn',
        )
        .then((_) => {
          let ids = this.selectedItems.map((m) => m.Id);

          this.arInvoiceProvider.RollbackMergedARInvoice({ Ids: ids }).then((resp: any) => {
            if (resp == 'empty') {
              this.env.showTranslateMessage(
                'Không tìn thấy thông tin hóa đơn cần gở bỏ. Vui lòng kiểm tra lại.',
                'warning',
              );
            } else if (resp == 'parent_empty') {
              this.env.showTranslateMessage(
                'Không tìn thấy thông tin hóa đơn gộp để thực hiện việc gỡ bỏ hóa đơn. Vui lòng kiểm tra lại.',
                'warning',
              );
            } else if (resp == '') {
              this.env.showTranslateMessage('Đã gỡ bỏ hóa đơn thành công!', 'success');
            } else {
              this.env.showTranslateMessage(resp + 'Xin vui lòng thông báo với quản trị viên!', 'danger');
            }

            this.submitAttempt = false;
            this.refresh();
            this.isAllChecked = false;
          });
        })
        .catch((_) => {});
    }
  }
}
