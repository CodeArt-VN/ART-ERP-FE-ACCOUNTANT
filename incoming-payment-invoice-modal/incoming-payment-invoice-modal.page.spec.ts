import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { IncomingPaymentInvoiceModalPage } from './incoming-payment-invoice-modal.page';

describe('IncomingPaymentInvoiceModalPage', () => {
  let component: IncomingPaymentInvoiceModalPage;
  let fixture: ComponentFixture<IncomingPaymentInvoiceModalPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [IncomingPaymentInvoiceModalPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IncomingPaymentInvoiceModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
