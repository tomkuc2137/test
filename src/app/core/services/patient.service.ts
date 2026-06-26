import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {DestroyRef, Injectable, SecurityContext} from '@angular/core';
import {DomSanitizer} from "@angular/platform-browser";
import {VpCurtainService} from "@vpsoftware/ngx-vpcommon/curtain";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {alert, custom} from "devextreme/ui/dialog";
import {Observable, of, throwError} from 'rxjs';
import {catchError, map, tap} from "rxjs/operators";
import dayjs from 'dayjs';

import {
  BasePatient,
  CreateOrUpdatePatientRequest,
  CreateOrUpdatePatientWithRelationsRequest,
  CreatePatientNoteRequest,
  CreateTreatmentPlanCycleRequest,
  CurrentDataEntry,
  DeleteTreatmentPlanCycleRequest,
  DeleteTreatmentPlanEntryRequest,
  DeleteTreatmentPlanEntryResult,
  Document,
  EmbryologyMaterialVial,
  FixSaveTreatmentPlanEntry,
  handleEwusError,
  handleEwusResponseCode,
  Patient,
  PatientDataEntitledPerson,
  PatientEwusInformation,
  PatientEwusStatus,
  PatientNote,
  PatientPhenotypeDataHistoryEntry,
  PatientPremedicationCard,
  PatientRelation,
  PatientTreatmentPlan,
  SaveCurrentDataEntriesRequest,
  SavePatientEmbryologyMaterial,
  SavePatientTreatmentPlanRequest,
  SaveTreatmentPlanCycleResult,
  SaveTreatmentPlanEntry,
  TemplateSubTypeDescriptor,
  TreatmentPlanCycle,
  TreatmentPlanEntry,
  UpdatePatientEwusInformationResponse,
  UpdatePatientNoteRequest,
  UpdateTreatmentPlanCycleRequest,
  UpdateTreatmentPlanEntryPositionRequest,
  Visit
} from 'model';
import {escapeHtml, toQueryString} from 'shared/utils';
import {DataSourceFactory} from './datasource.factory';
import {DownloadedDocument} from "./downloaded-document";

const ApiEndPoint = `api/patients`;

export const DELETED_PATIENT_DISPLAY_NAME = 'Usunięty pacjent';

export interface GetPatientOptions {
  includeDeleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  constructor(
    private httpClient: HttpClient,
    private dsf: DataSourceFactory,
    private cs: VpCurtainService,
    private sanitizer: DomSanitizer
  ) {
  }

  getDataSource() {
    return this.dsf.createDataSource<Patient, number>(`${ApiEndPoint}/dataSource`);
  }

  getPatient(id: number, options?: GetPatientOptions): Observable<Patient> {
    const query = options?.includeDeleted ? '?includeDeleted=true' : '';
    return this.httpClient.get<Patient>(`${ApiEndPoint}/${id}${query}`).pipe(
      tap(patient => PatientService.fixPatientDates(patient))
    );
  }

  getPatientForReference(id: number): Observable<Patient> {
    return this.getPatient(id, {includeDeleted: true}).pipe(
      catchError((err: HttpErrorResponse) =>
        err.status === 404 ? of(PatientService.createDeletedPatientPlaceholder(id)) : throwError(() => err)
      )
    );
  }

  static getPatientDisplayName(patient: Pick<Patient, 'firstName' | 'lastName' | 'deleted'> | null | undefined): string {
    if (!patient) {
      return DELETED_PATIENT_DISPLAY_NAME;
    }
    if (patient.deleted) {
      return DELETED_PATIENT_DISPLAY_NAME;
    }
    return `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() || DELETED_PATIENT_DISPLAY_NAME;
  }

  static createDeletedPatientPlaceholder(id: number): Patient {
    return {
      id,
      firstName: 'Usunięty',
      lastName: 'pacjent',
      fullName: DELETED_PATIENT_DISPLAY_NAME,
      deleted: true
    } as Patient;
  }

  private static fixPatientDates(patient: Patient) {
    if (patient.dateOfBirth) {
      patient.dateOfBirth = dayjs(patient.dateOfBirth).toDate();
    }
    if (patient.identificationDocumentExpiryDate) {
      patient.identificationDocumentExpiryDate = dayjs(patient.identificationDocumentExpiryDate).toDate();
    }
    if (patient.insuranceEligibilityExpiration) {
      patient.insuranceEligibilityExpiration = dayjs(patient.insuranceEligibilityExpiration).toDate();
    }
  }

  getPatientsByPhoneNumber(phoneNumber: string): Observable<BasePatient[]> {
    return this.httpClient.get<BasePatient[]>(`${ApiEndPoint}/byPhoneNumber/${phoneNumber}`);
  }

  getPatientRelations(id: number): Observable<PatientRelation[]> {
    return this.httpClient.get<PatientRelation[]>(`${ApiEndPoint}/${id}/relations`);
  }

  getPatientDataEntitledPersons(id: number): Observable<PatientDataEntitledPerson[]> {
    return this.httpClient.get<PatientDataEntitledPerson[]>(`${ApiEndPoint}/${id}/dataEntitledPersons`);
  }

  savePatientPhenotypeData(patientId: number, payload: SaveCurrentDataEntriesRequest): Observable<CurrentDataEntry[]> {
    const lastMenstrual = payload.entries.find(x => x.key === 'lastMenstrual');
    if (lastMenstrual)
      lastMenstrual.value = lastMenstrual.value ? dayjs(lastMenstrual.value).format('YYYY-MM-DD') : null;
    return this.httpClient.put<CurrentDataEntry[]>(`${ApiEndPoint}/${patientId}/phenotypeData`, payload);
  }

  getPatientCurrentDataEntries(patientId: number): Observable<CurrentDataEntry[]> {
    return this.httpClient.get<CurrentDataEntry[]>(`${ApiEndPoint}/${patientId}/currentDataEntries`);
  }

  getPatientInTimeCurrentDataEntries(patientId: number, effectiveTime: Date): Observable<CurrentDataEntry[]> {
    const dateTime = dayjs(effectiveTime).format('YYYY-MM-DD HH:mm');
    const optionsQuery = toQueryString({effectiveTime: dateTime});

    return this.httpClient.get<CurrentDataEntry[]>(`${ApiEndPoint}/${patientId}/currentDataEntries/inTime?${optionsQuery}`);
  }

  getPatientPhenotypeDataHistory(patientId: number): Observable<PatientPhenotypeDataHistoryEntry[]> {
    return this.httpClient.get<PatientPhenotypeDataHistoryEntry[]>(`${ApiEndPoint}/${patientId}/phenotypeData/history`);
  }

  getPatientRelationCurrentDataEntries(patientId: number) {
    return this.httpClient.get<CurrentDataEntry[]>(`${ApiEndPoint}/${patientId}/relationCurrentDataEntries`);
  }

  getActiveRelation(patientId: number, options: {
    expectRelationId?: number;
  }): Observable<PatientRelation> {
    options = options || {};
    const optionsQuery = toQueryString(options);
    return this.httpClient.get<PatientRelation>(`${ApiEndPoint}/${patientId}/activeRelation?${optionsQuery}`);
  }

  getPatientLastVisit(patientId: number) {
    return this.httpClient.get<Visit>(`${ApiEndPoint}/${patientId}/lastVisit`);
  }

  createOrUpdatePatientWithRelations(payload: CreateOrUpdatePatientWithRelationsRequest) : Observable<Patient>
  {
    PatientService.fixCreateOrUpdatePatientRequest(payload);
    payload.relations?.forEach(x => {
      x.dateOfRelation = x.dateOfRelation
        ? dayjs(x.dateOfRelation).format('YYYY-MM-DD') : null;
      PatientService.fixCreateOrUpdatePatientRequest(x.partner);
    });

    return this.httpClient.post<Patient>(`${ApiEndPoint}/withRelations`, payload);
  }

  static fixCreateOrUpdatePatientRequest(payload: CreateOrUpdatePatientRequest) {
    payload.identificationDocumentExpiryDate = payload.identificationDocumentExpiryDate
      ? dayjs(payload.identificationDocumentExpiryDate).format('YYYY-MM-DD') : null;
    payload.secondaryIdentificationDocumentExpiryDate = payload.secondaryIdentificationDocumentExpiryDate
      ? dayjs(payload.secondaryIdentificationDocumentExpiryDate).format('YYYY-MM-DD') : null;
    payload.dateOfBirth = payload.dateOfBirth
      ? dayjs(payload.dateOfBirth).format('YYYY-MM-DD') : null;
    payload.insuranceEligibilityExpiration = payload.dateOfBirth
      ? dayjs(payload.insuranceEligibilityExpiration).format('YYYY-MM-DD') : null;
    payload.dataEntitledPersons = payload.dataEntitledPersons?.map(x => ({
      ...x,
      id: x.id > 0 ? x.id : null
    })) ?? [];
  }

  createPatientNote(patientId: number, payload: CreatePatientNoteRequest): Observable<PatientNote> {
    return this.httpClient.post<PatientNote>(`${ApiEndPoint}/${patientId}/notes`, payload);
  }

  getPatientNotes(patientId: number): Observable<PatientNote[]> {
    return this.httpClient.get<PatientNote[]>(`${ApiEndPoint}/${patientId}/notes`).pipe(
      tap(notes => {
        if (!notes.length) return;
        notes.forEach(note => {
          note.dateCreated = dayjs.utc(note.dateCreated).toDate();
        });
      })
    );
  }

  updatePatientNote(patientId: number, noteId: number, request: UpdatePatientNoteRequest): Observable<PatientNote> {
    return this.httpClient.put<PatientNote>(`${ApiEndPoint}/${patientId}/notes/${noteId}`, request);
  }

  deletePatientNote(patientId: number, noteId: number) {
    return this.httpClient.delete(`${ApiEndPoint}/${patientId}/notes/${noteId}`);
  }

  updateEwusData(patientId: number, force: boolean) {
    return this.httpClient.post<UpdatePatientEwusInformationResponse>(`${ApiEndPoint}/${patientId}/ewus/update`, {force});
  }

  confirmEwusData(patientId: number, dataId: number) {
    return this.httpClient.post<void>(`${ApiEndPoint}/${patientId}/ewus/${dataId}/confirm`, {});
  }

  getEwusDataSource(patientId: number) {
    return this.dsf.createDataSource(`${ApiEndPoint}/${patientId}/ewus/dataSource`,
      {mapping: x => x.forEach(PatientService.fixEwusData)});
  }

  getPatientProcedureDocuments(patientId: number, procedureId: number, templateSubType: TemplateSubTypeDescriptor) {
    return this.httpClient.get<Document[]>(`${ApiEndPoint}/${patientId}/procedureDocuments/${procedureId}/${templateSubType}`);
  }

  getCurrentEwusData(patientId: number) {
    return this.httpClient.get<PatientEwusInformation>(`${ApiEndPoint}/${patientId}/ewus/current`).pipe(
      tap(PatientService.fixEwusData)
    );
  }

  createStatement(patientId: number, date: Date, nfzUnitId: number) {
    let payload = {
      date: dayjs(date).format('YYYY-MM-DD'),
      nfzUnitId
    };
    return this.httpClient.post<PatientEwusInformation>(`${ApiEndPoint}/${patientId}/ewus/statement`, payload).pipe(
      tap(PatientService.fixEwusData)
    );
  }

  getStatement(patientId: number) {
    return this.httpClient.get(`${ApiEndPoint}/${patientId}/ewus/statement`, {observe: 'response', responseType: 'blob'}).pipe(
      map(x => new DownloadedDocument(x))
    );
  }

  getPatientPhenotypeDataDocument(patientId: number) {
    return this.httpClient.get(`${ApiEndPoint}/${patientId}/phenotypeData/document`, {observe: 'response', responseType: 'blob'}).pipe(
      catchError((err) => {
        if (err.error.type=='application/json'){
          return this.parseErrorBlob(err);
        } else {
          return throwError(() => err);
        }
      }),
      map(resp => new DownloadedDocument(resp)
      )
    );
  }

  getPatientPremedicationCard(patientId: number, premedicationCardId: number) {
    return this.httpClient.get<PatientPremedicationCard>(`${ApiEndPoint}/${patientId}/premedicationCards/${premedicationCardId}`);
  }

  uploadPatientMedicalExaminations(patientId: number, payload: FormData): Observable<Document[]> {
    return this.httpClient.post<Document[]>(`${ApiEndPoint}/${patientId}/medicalExaminations`, payload);
  }

  updatePatientEwus(currentPatient: EwusPatientRequest, dr: DestroyRef) {
    return this.updatePatientEwusInternal(currentPatient, dr, false);
  }

  getPatientTreatmentPlans(patientId: number): Observable<PatientTreatmentPlan[]> {
    return this.httpClient.get<PatientTreatmentPlan[]>(`${ApiEndPoint}/${patientId}/treatment-plans`).pipe(
      map(x => x.map(PatientService.FixPatientTreatmentPlan))
    );
  }

  getPatientTreatmentPlan(patientId: number, planId: number): Observable<PatientTreatmentPlan> {
    return this.httpClient.get<PatientTreatmentPlan>(`${ApiEndPoint}/${patientId}/treatment-plans/${planId}`).pipe(
      map(PatientService.FixPatientTreatmentPlan)
    );
  }

  getPatientTreatmentPlanLatest(patientId: number): Observable<PatientTreatmentPlan> {
    return this.httpClient.get<PatientTreatmentPlan>(`${ApiEndPoint}/${patientId}/treatment-plans/latest`).pipe(
      map(PatientService.FixPatientTreatmentPlan)
    );
  }

  getPatientTreatmentPlanDocumentPreview(patientId: number, planId: number, options: {
    templateId: number
  }): Observable<Blob> {
    const optionsQuery = toQueryString(options);
    return this.httpClient.get(`${ApiEndPoint}/${patientId}/treatment-plans/${planId}/document/preview?${optionsQuery}`,
      { observe: 'response', responseType: 'blob' }).pipe(
      map(x => x.body)
    );
  }

  savePatientTreatmentPlanDocument(patientId: number, planId: number, clinicId: number, templateId: number, document: Blob): Observable<DownloadedDocument> {
    let fData = new FormData();
    fData.append('patientId', patientId.toString());
    fData.append('planId', planId.toString());
    fData.append('clinicId', clinicId.toString());
    fData.append('templateId', templateId.toString());
    fData.append('document', document);
    return this.httpClient.post(`${ApiEndPoint}/${patientId}/treatment-plans/${planId}/document`, fData, { observe: 'response', responseType: 'blob' }).pipe(
      catchError((err) => {
        if (err.error.type === 'application/json') {
          return this.parseErrorBlob(err);
        } else {
          return throwError(() => err);
        }
      }),
        map(resp => new DownloadedDocument(resp))
      );
  }

  createPatientTreatmentPlan(payload: SavePatientTreatmentPlanRequest): Observable<PatientTreatmentPlan>{
    payload.dateStarted = payload.dateStarted ? dayjs(payload.dateStarted).format('YYYY-MM-DD') : null;
    return this.httpClient.post<PatientTreatmentPlan>(`${ApiEndPoint}/${payload.patientId}/treatment-plans`, payload).pipe(
      map(PatientService.FixPatientTreatmentPlan)
    );
  }

  updatePatientTreatmentPlan(payload: SavePatientTreatmentPlanRequest): Observable<PatientTreatmentPlan>{
    payload.dateStarted = payload.dateStarted ? dayjs(payload.dateStarted).format('YYYY-MM-DD') : null;
    return this.httpClient.put<PatientTreatmentPlan>(`${ApiEndPoint}/${payload.patientId}/treatment-plans/${payload.treatmentPlanId}`, payload).pipe(
      map(PatientService.FixPatientTreatmentPlan)
    );
  }

  deletePatientTreatmentPlan(patientId:number, id: number): Observable<void>{
    return this.httpClient.delete<void>(`${ApiEndPoint}/${patientId}/treatment-plans/${id}`);
  }

  getPatientTreatmentPlanEntries(patientId: number, planId: number): Observable<TreatmentPlanEntry[]> {
    return this.httpClient.get<TreatmentPlanEntry[]>(`${ApiEndPoint}/${patientId}/treatment-plans/${planId}/entries`).pipe(

    );
  }

  createPatientTreatmentPlanEntry(payload: SaveTreatmentPlanEntry) {
    return this.httpClient.post<TreatmentPlanEntry[]>(`${ApiEndPoint}/${payload.patientId}/treatment-plans/${payload.treatmentPlanId}/entries`,
      FixSaveTreatmentPlanEntry(payload));
  }

  updatePatientTreatmentPlanEntry(entryId: number, payload: SaveTreatmentPlanEntry) {
    return this.httpClient.put<TreatmentPlanEntry[]>(`${ApiEndPoint}/${payload.patientId}/treatment-plans/${payload.treatmentPlanId}/entries/${entryId}`,
      FixSaveTreatmentPlanEntry(payload));
  }

  updatePatientTreatmentPlanEntryPosition(payload: UpdateTreatmentPlanEntryPositionRequest) {
    return this.httpClient.put<TreatmentPlanEntry[]>(`${ApiEndPoint}/${payload.patientId}/treatment-plans/${payload.planId}/entries/${payload.entryId}/position`, payload);
  }

  deletePatientTreatmentPlanEntry(payload: DeleteTreatmentPlanEntryRequest): Observable<DeleteTreatmentPlanEntryResult> {
    return this.httpClient.delete<DeleteTreatmentPlanEntryResult>(`${ApiEndPoint}/${payload.patientId}/treatment-plans/${payload.planId}/entries/${payload.entryId}`);
  }

  getPatientTreatmentPlanCycles(patientId: number, planId: number): Observable<TreatmentPlanCycle[]> {
    return this.httpClient.get<TreatmentPlanCycle[]>(`${ApiEndPoint}/${patientId}/treatment-plans/${planId}/cycles`).pipe(
      map(x => x.map(PatientService.FixFixTreatmentPlanCycle))
    );
  }

  createPatientTreatmentPlanCycle(payload: CreateTreatmentPlanCycleRequest): Observable<SaveTreatmentPlanCycleResult> {
    payload.dateStart = dayjs(payload.dateStart).format('YYYY-MM-DD');
    payload.dateEnd = dayjs(payload.dateEnd).format('YYYY-MM-DD');
    return this.httpClient.post<SaveTreatmentPlanCycleResult>(`${ApiEndPoint}/${payload.patientId}/treatment-plans/${payload.planId}/cycles`, payload).pipe(
      map(x => ({
        cycles: x.cycles.map(PatientService.FixFixTreatmentPlanCycle),
        changedEntries: x.changedEntries
      }))
    );
  }

  updatePatientTreatmentPlanCycle(payload: UpdateTreatmentPlanCycleRequest): Observable<SaveTreatmentPlanCycleResult> {
    payload.dateStart = dayjs(payload.dateStart).format('YYYY-MM-DD');
    payload.dateEnd = dayjs(payload.dateEnd).format('YYYY-MM-DD');
    return this.httpClient.put<SaveTreatmentPlanCycleResult>(`${ApiEndPoint}/${payload.patientId}/treatment-plans/${payload.planId}/cycles/${payload.cycleId}`, payload).pipe(
      map(x => ({
        cycles: x.cycles.map(PatientService.FixFixTreatmentPlanCycle),
        changedEntries: x.changedEntries
      }))
    );
  }

  deletePatientTreatmentPlanCycle(payload: DeleteTreatmentPlanCycleRequest): Observable<SaveTreatmentPlanCycleResult> {
    return this.httpClient.delete<SaveTreatmentPlanCycleResult>(`${ApiEndPoint}/${payload.patientId}/treatment-plans/${payload.planId}/cycles/${payload.cycleId}`).pipe(
      map(x => ({
        cycles: x.cycles.map(PatientService.FixFixTreatmentPlanCycle),
        changedEntries: x.changedEntries
      }))
    );
  }

  savePatientEmbryologyMaterials(payload: SavePatientEmbryologyMaterial): Observable<EmbryologyMaterialVial[]> {
    payload.depositDateCreated = payload.depositDateCreated ? dayjs(payload.depositDateCreated).format('YYYY-MM-DD') : null;
    return this.httpClient.post<EmbryologyMaterialVial[]>(`${ApiEndPoint}/${payload.patientId}/embryology-materials`, payload);
  }

  mergePatients(sourcePatientId: number, payload: MergePatientsRequest): Observable<void> {
    return this.httpClient.post<void>(`${ApiEndPoint}/${sourcePatientId}/merge`, payload);
  }

  private updatePatientEwusInternal(currentPatient: EwusPatientRequest, dr: DestroyRef, force: boolean) {
    return new Promise<boolean>((resolve) => {
      const job = this.updateEwusData(currentPatient.id, force).pipe(
        takeUntilDestroyed(dr)
      );
      this.cs.waitFor(job, 'Aktualizowanie danych EWUŚ')
        .subscribe({
        next: async ewusData =>
        {
          await handleEwusResponseCode(ewusData.ewusLoginResponseCode);

          if (ewusData.status === PatientEwusStatus.NotFound) {
            alert('Brak danych pacjenta w bazie CWK', 'Brak danych pacjenta').then();
            resolve(true);
            return;
          }
          if (ewusData.status === PatientEwusStatus.Outdated) {
            alert('Numer PESEL został unieważniony', 'Brak danych pacjenta').then();
            resolve(true);
            return;
          }
          if (ewusData.nameMismatch) {
            let dialog = custom({
              buttons: [
                {
                  text: 'Kontynuuj', type: 'danger', onClick: async () => {
                    await this.confirmEwus(currentPatient, dr, ewusData.id);
                    resolve(true);
                    return true;
                  }
                },
                {
                  text: 'Anuluj', type: 'default', onClick: () => {
                    resolve(false);
                    return false;
                  }
                }
              ],
              messageHtml: `Dane osobowe w rejestrze eWUŚ nie odpowiadają danym w systemie.<br/>
                <div class="text-left mt-3">
                    <b>Dane w systemie</b><br/>
                    <b>Imię: </b>${escapeHtml(currentPatient.firstName)}<br/>
                    <b>Nazwisko: </b>${escapeHtml(currentPatient.lastName)}<br/>
                </div>
                <div class="text-left mt-3">
                    <b>Dane w eWUŚ</b><br/>
                    <b>Imię: </b>${escapeHtml(ewusData.givenName)}<br/>
                    <b>Nazwisko: </b>${escapeHtml(ewusData.familyName)}<br/>
                </div>`,
              showTitle: true,
              title: 'Niezgodność danych'
            });
            dialog.show();
            return;
          }
          let name = this.sanitizer.sanitize(SecurityContext.HTML, `${currentPatient.firstName} ${currentPatient.lastName}`);
          if (!ewusData.isInsuranceValid) {
            alert(`Pacjent <b>${name} <span class="text-danger">nie posiada uprawnień</span></span> do refundacji świadczeń`, 'Brak uprawnień').then(() => {
              resolve(true);
            });
          } else {
            alert(`Pacjent <b>${name} <span class="text-success">posiada uprawnienia</span></b> do refundacji świadczeń`, 'Potwierdzenie uprawnień').then(() => {
              resolve(true);
            });
          }
        },
        error: err => {
          handleEwusError(err);
          resolve(false);
        }
      });
    });
  }

  private confirmEwus(currentPatient: EwusPatientRequest, dr: DestroyRef, ewusDataId: number) {
    return new Promise<boolean>((resolve, reject) => {
      const job = this.confirmEwusData(currentPatient.id, ewusDataId).pipe(
        takeUntilDestroyed(dr)
      );

      this.cs.waitFor(job, 'Aktualizowanie danych EWUŚ')
        .subscribe({
          next: () => {
            resolve(true);
          },
          error: err => {
            console.error(err);
            reject(err);
            alert('Nie udało się zapisać potwierdzenia', 'Błąd').then();
          }
      });
    });
  }

  private static fixEwusData(input: PatientEwusInformation) {
    if (!input) return;
    input.expirationDate = dayjs.utc(input.expirationDate).toDate();
    input.checkOperationDateTime = dayjs.utc(input.checkOperationDateTime).toDate();
  }

  private parseErrorBlob(err: HttpErrorResponse): Observable<any> {
    const reader: FileReader = new FileReader();
    const obs = new Observable((observer: any) => {
      reader.onloadend = () => {
        const messageObject = JSON.parse(reader.result as string);
        observer.error({
          error: {
            ...messageObject
          },
          message: messageObject.message,
          status: err.status,
        });
        observer.complete();
      };
    });
    reader.readAsText(err.error);
    return obs;
  }

  private static FixPatientTreatmentPlan(value: PatientTreatmentPlan): PatientTreatmentPlan {
    return {
      ...value,
      dateCreated: dayjs(value.dateCreated, 'YYYY-MM-DD HH:mm').toDate(),
      dateStarted: dayjs(value.dateStarted, 'YYYY-MM-DD').toDate(),
      dateUpdated: value.dateUpdated
        ? dayjs(value.dateUpdated, 'YYYY-MM-DD HH:mm').toDate() : undefined
    };
  }

  private static FixFixTreatmentPlanCycle(value: TreatmentPlanCycle): TreatmentPlanCycle {
    return {
      ...value,
      dateStart: dayjs(value.dateStart, 'YYYY-MM-DD').toDate(),
      dateEnd: dayjs(value.dateEnd, 'YYYY-MM-DD').toDate()
    };
  }
}

export interface EwusPatientRequest {
  firstName: string;
  lastName: string;
  id: number;
}
export interface MergePatientsRequest {
  targetPatientId: number;
  moveVisits: boolean;
  moveDiagnosticResults: boolean;
  moveDispositions: boolean;
  moveSettlements: boolean;
}
