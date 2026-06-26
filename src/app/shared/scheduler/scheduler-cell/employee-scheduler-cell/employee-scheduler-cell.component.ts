import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {forkJoin, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';

import {PatientService} from 'core/services/patient.service';
import {EmployeeScheduleEntryView} from 'shared/scheduler/scheduler';
import {Patient} from 'model';
import {VisitDraggedEvent, VisitExtraScheduledDraggedEvent} from 'shared/scheduler/scheduler-cell/scheduler-cell';
import {BaseModule} from 'shared/base.module';

export interface SchedulerVisitView {
  id: number;
  patientId: number;
  patientDisplayName: string;
  patientDeleted: boolean;
  dateStart: Date;
  dateEnd: Date;
}

@Component({
  selector: 'vp-employee-scheduler-cell',
  standalone: true,
  imports: [BaseModule],
  templateUrl: './employee-scheduler-cell.component.html',
  styleUrls: ['./employee-scheduler-cell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeSchedulerCellComponent {
  appointmentData = input.required<EmployeeScheduleEntryView>();
  cellHeight = input<number>(60);
  cellDuration = input<number>(15);

  visitCreate = output<{
    dateStart: Date;
    dateEnd: Date;
    employeeId: number;
    clinicId: number;
    clinicRoomId?: number;
  }>();
  visitUpdate = output<number>();
  visitDragged = output<VisitDraggedEvent>();
  visitExtraScheduledDragged = output<VisitExtraScheduledDraggedEvent>();
  availabilityUpdate = output<number>();

  private readonly patientService = inject(PatientService);
  private readonly dr = inject(DestroyRef);

  protected readonly visits = signal<SchedulerVisitView[]>([]);
  protected readonly loading = signal(false);
  protected readonly hasDeletedPatients = computed(() => this.visits().some(v => v.patientDeleted));

  constructor() {
    effect(() => {
      const appointment = this.appointmentData();
      this.loadVisitPatients(appointment);
    });
  }

  private loadVisitPatients(appointment: EmployeeScheduleEntryView) {
    const visitEntries = appointment?.visits?.filter(v => v.patientId) ?? [];
    if (!visitEntries.length) {
      this.visits.set([]);
      return;
    }

    const uniquePatientIds = [...new Set(visitEntries.map(v => v.patientId))];
    this.loading.set(true);

    forkJoin(
      uniquePatientIds.map(patientId =>
        this.patientService.getPatientForReference(patientId).pipe(
          map(patient => ({patientId, patient})),
          catchError(() => of({
            patientId,
            patient: PatientService.createDeletedPatientPlaceholder(patientId)
          }))
        )
      )
    ).pipe(takeUntilDestroyed(this.dr))
      .subscribe({
        next: patientResults => {
          const patientsById = new Map<number, Patient>(
            patientResults.map(({patientId, patient}) => [patientId, patient])
          );

          this.visits.set(visitEntries.map(visit => {
            const patient = patientsById.get(visit.patientId);
            return {
              id: visit.id,
              patientId: visit.patientId,
              patientDisplayName: PatientService.getPatientDisplayName(patient),
              patientDeleted: !!patient?.deleted,
              dateStart: new Date(visit.dateStart),
              dateEnd: new Date(visit.dateEnd)
            };
          }));
          this.loading.set(false);
        },
        error: () => {
          this.visits.set(visitEntries.map(visit => ({
            id: visit.id,
            patientId: visit.patientId,
            patientDisplayName: PatientService.getPatientDisplayName(null),
            patientDeleted: true,
            dateStart: new Date(visit.dateStart),
            dateEnd: new Date(visit.dateEnd)
          })));
          this.loading.set(false);
        }
      });
  }

  protected onVisitClick(visitId: number) {
    this.visitUpdate.emit(visitId);
  }
}
