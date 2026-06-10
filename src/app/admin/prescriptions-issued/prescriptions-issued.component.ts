import {ChangeDetectionStrategy, Component, DestroyRef, inject} from '@angular/core';
import {DxButtonModule, DxDataGridModule} from 'devextreme-angular';
import {PrescriptionService} from 'core/services/prescription.service';
import {VpCurtainService, VpDxCommonModule} from '@vpsoftware/ngx-vpcommon';
import {DataSourceFactory} from "core/services/datasource.factory";
import {RouterLink, Router} from "@angular/router";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {ToastrService} from "ngx-toastr";
import {lastValueFrom} from "rxjs";
import {DocumentService} from "core/services";
import {select, Store} from "@ngxs/store";
import {EmployeesState, GetAllEmployees} from "store/employees";
import {ClientWorkItemResult, Document, Prescription, VisitStatus} from "model";
import {WorkItemService} from "core/services/work-item.service";
import {dxAlert} from "shared/utils";
import {VisitService} from "core/services/visits/visit.service";
import {HttpClient, HttpErrorResponse} from "@angular/common/http";

interface PrescriptionTableEntry {
  prescriptionId: number;
  visitId: number;
  medicamentDisplayText: string | null;
  createdDate: Date | string;
  rpwdl: string | null;
  status: number;
  patientId: number;
  issuerId: number;
  workItemId: string | null;
  documents: Document[];
}

@Component({
  selector: 'vp-prescriptions-issued',
  standalone: true,
  imports: [
    DxDataGridModule,
    VpDxCommonModule,
    RouterLink,
    DxButtonModule
  ],
  templateUrl: './prescriptions-issued.component.html',
  styleUrl: './prescriptions-issued.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrescriptionsIssuedComponent {

  private readonly prescriptionService = inject(PrescriptionService);
  private readonly dataSourceFactory = inject(DataSourceFactory);
  private readonly documentService = inject(DocumentService);
  private readonly dr = inject(DestroyRef);
  private readonly cs = inject(VpCurtainService);
  private readonly toastr = inject(ToastrService);
  private readonly store = inject(Store);
  private readonly httpClient = inject(HttpClient);
  private readonly workItemService = inject(WorkItemService);
  private readonly visitService = inject(VisitService);
  private readonly router = inject(Router);

  protected statusDictionary = [
    { value: 0, caption: 'Nieznana' },
    { value: 1, caption: 'Przygotowana' },
    { value: 2, caption: 'Wystawiona' },
    { value: 3, caption: 'Błąd' },
    { value: 4, caption: 'Anulowana' }
  ];

  protected dataSource = this.prescriptionService.getAllPrescriptionsIssuedDataSource();
  protected patientsDictionary = this.dataSourceFactory.createDataSource('/api/patients/dataSource', { key: 'id' });
  protected employees = select(EmployeesState.getAllEmployees);


  constructor() {
    this.store.dispatch(new GetAllEmployees());
  }

  protected goToPrescriptionForm = async (rowData: PrescriptionTableEntry) => {
    if (!rowData?.workItemId) {
      this.toastr.warning('Brak powiązanego zadania dla tej recepty');
      return;
    }

    try {
      const prescriptionsJob = this.workItemService
        .workItemPrescriptionsByWorkItemId(rowData.workItemId)
        .pipe(takeUntilDestroyed(this.dr));
      const prescriptions: Prescription[] = await this.cs.waitFor(
        lastValueFrom(prescriptionsJob, {defaultValue: null}), 'Wczytywanie danych');

      const first = prescriptions?.[0];
      if (!first) {
        dxAlert('Szczegóły wystawianej recepty nie są dostępne.', 'Brak danych');
        return;
      }

      const visitJob = this.visitService.getVisit(first.visitId).pipe(
        takeUntilDestroyed(this.dr)
      );
      const visit = await this.cs.waitFor(lastValueFrom(visitJob, {defaultValue: null}), 'Wczytywanie danych');

      if (!visit || visit.status != VisitStatus.InProgress) {
        dxAlert(
          '<div class="text-center">Wizyta została zamknięta.</br> Szczegóły wystawianej recepty nie są dostępne.</br> Wystaw ponownie receptę.</div>',
          'Wizyta zamknięta');
        return;
      }

      const resultJob = this.workItemService
        .getWorkItemResultByWorkItemId(rowData.workItemId)
        .pipe(takeUntilDestroyed(this.dr));
      const result: ClientWorkItemResult = await this.cs.waitFor(
        lastValueFrom(resultJob, {defaultValue: null}), 'Wczytywanie danych');

      let error: HttpErrorResponse = undefined;
      if (result && !result.isSuccess) {
        error = new HttpErrorResponse({
          error: {
            errorCode: result.errorCode,
            ...result.errorDetails
          },
          status: result.httpStatusCode
        });
      }

      this.router.navigate(['Pacjenci', first.patientId, 'Panel', 'Wizyty', first.visitId]).then(() => {
        this.workItemService.pendingAction.set({
          prescriptions: prescriptions,
          type: 'open',
          error: error
        });
      });
    } catch (e) {
      console.error(e);
      this.toastr.error('Błąd wczytywania danych');
    }
  };

  protected onOpenPrescriptionClick = async (e: any) => {
    const rowData = e.row.data;
    try {
      const job = this.prescriptionService.getPrescriptionDocument(rowData.patientId, rowData.prescriptionId)
        .pipe(takeUntilDestroyed(this.dr));
      const document: any = await this.cs.waitFor(lastValueFrom(job, {defaultValue: null}), 'Wyszukiwanie dokumentu');
      if (!document) {
        this.toastr.warning('Nie znaleziono etykiety dla tej recepty');
        return;
      }
      const fileJob = this.documentService.downloadDocument(document.id).pipe(takeUntilDestroyed(this.dr));
      const documentFile: any = await this.cs.waitFor(lastValueFrom(fileJob, {defaultValue: null}), 'Pobieranie dokumentu');

      documentFile.preview();

    } catch (error) {
      console.error(error);
      this.toastr.error('Błąd pobierania dokumentu');
    }
  };

  protected getDocuments(input: Document[]) {
    return input;
  }
  protected getDocumentIcon(doc: Document): string {
    if (!doc || !doc.fileName) return 'fa fa-file-o';

    const fileName = doc.fileName.toLowerCase();

    if (fileName.endsWith('.xml')) {
      return 'fa fa-file-code-o text-primary';
    }
    if (fileName.endsWith('.html')) {
      return 'fa fa-file-code-o text-info';
    }

    return 'fa fa-file-o text-secondary';
  }

  protected downloadDocumentItem(document: Document) {
    this.documentService.downloadDocument(document.id).pipe(
      takeUntilDestroyed(this.dr)
    ).subscribe({
      next: (file) => {
        file.download();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Wystąpił błąd podczas pobierania dokumentu');
      }
    });
  }
}
