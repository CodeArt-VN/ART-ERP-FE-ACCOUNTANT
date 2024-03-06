import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ARInvoiceMergeModalPage } from './arinvoice-merge-modal.page';

describe('ARInvoiceMergeModalPage', () => {
  let component: ARInvoiceMergeModalPage;
  let fixture: ComponentFixture<ARInvoiceMergeModalPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ARInvoiceMergeModalPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ARInvoiceMergeModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
