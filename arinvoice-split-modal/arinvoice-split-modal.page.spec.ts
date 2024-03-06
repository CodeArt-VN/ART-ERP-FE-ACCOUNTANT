import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ARInvoiceSplitModalPage } from './arinvoice-split-modal.page';

describe('ARInvoiceSplitModalPage', () => {
  let component: ARInvoiceSplitModalPage;
  let fixture: ComponentFixture<ARInvoiceSplitModalPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ARInvoiceSplitModalPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ARInvoiceSplitModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
