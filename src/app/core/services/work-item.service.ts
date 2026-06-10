import {Injectable, signal} from "@angular/core";
import {HubConnection, HubConnectionBuilder, JsonHubProtocol, LogLevel} from "@microsoft/signalr";
import {ToastrService} from "ngx-toastr";
import {from, lastValueFrom, Observable, switchMap} from "rxjs";
import {map, retry} from "rxjs/operators";

import {
  HubStatus,
  ClientWorkItem,
  ClientWorkItemStatus,
  ClientWorkItemType,
  Prescription,
  FixPrescription,
  ClientWorkItemResult
} from "model";
import {TokenRefresherService} from "../token-refresher.service";
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {DataSourceFactory} from "./datasource.factory";

const EndPoint = 'clientWorkItems';
const HubEndPoint = '/hub/' + EndPoint;
const ApiEndPoint = `api/` + EndPoint;

export interface PrescriptionsPendingAction {
  prescriptions: Prescription[];
  error?: HttpErrorResponse;
  type: 'repeat' | 'open';
}

@Injectable()
export class WorkItemService {

  public status = signal<HubStatus>('loading');
  public items = signal<ClientWorkItem[]>([]);
  public completed = signal<ClientWorkItem>(null);
  public pendingAction = signal<PrescriptionsPendingAction | null>(null);

  private hubConnection: HubConnection;

  constructor(
    private tokenRefresherService: TokenRefresherService,
    private toastr: ToastrService,
    private httpClient: HttpClient,
    private dsf: DataSourceFactory
  ) {
    this.initHubConnection();
  }

  getWorkItemsDataSource() {
    return this.dsf.createDataSource<ClientWorkItem, number>(`${ApiEndPoint}/dataSource`);
  }

  getWorkItemResult(id: number): Observable<ClientWorkItemResult> {
    return this.httpClient.get<ClientWorkItemResult>(`${ApiEndPoint}/${id}/result`);
  }

  getWorkItemResultByWorkItemId(workItemId: string): Observable<ClientWorkItemResult> {
    return this.httpClient.get<ClientWorkItemResult>(`${ApiEndPoint}/byWorkItemId/${workItemId}/result`);
  }

  markAsReadClientWorkItem(id: number) {
    return this.httpClient.post<ClientWorkItem>(`${ApiEndPoint}/${id}/markAsRead`, { id });
  }

  workItemPrescriptions(id: number): Observable<Prescription[]> {
    return this.httpClient.get<Prescription[]>(`${ApiEndPoint}/${id}/prescriptions`).pipe(
      map(x => x.map(FixPrescription))
    );
  }

  workItemPrescriptionsByWorkItemId(workItemId: string): Observable<Prescription[]> {
    return this.httpClient.get<Prescription[]>(`${ApiEndPoint}/byWorkItemId/${workItemId}/prescriptions`).pipe(
      map(x => x.map(FixPrescription))
    );
  }

  public async connectToHub() {
    try {
      const job = from(this.hubConnection.start()).pipe(
        retry(5),
        switchMap(() => from(this.hubConnection.invoke('GetActiveWorkItems')).pipe(
          retry(5)
        ))
      );

      const result = await lastValueFrom(job);
      this.items.set(result);
      this.notifyStatusChanged(undefined);
    }
    catch (err) {
      console.error(err);
      this.notifyStatusChanged('error');
    }
  }

  public async disconnectFromHub() {
    try {
      await this.hubConnection.stop();
    }
    catch (err) {
      console.error(err);
    }
  }

  private initHubConnection() {
    this.hubConnection = new HubConnectionBuilder()
      .withHubProtocol(new JsonHubProtocol())
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect([100, 1000, 2000, 5000, 10000, 10000, 10000, 10000, null])
      .withUrl(`${HubEndPoint}`, {
        accessTokenFactory: () =>
          new Promise<string>((resolve, reject) => {
            this.tokenRefresherService.ensureValidAccessToken().subscribe({
              next: (token) => {
                resolve(token);
              },
              error: (error) => {
                reject(error);
              }
            });
          })
      })
      .build();

    this.hubConnection.onreconnecting(() => {
      this.notifyStatusChanged('reconnecting');
    });

    this.hubConnection.onreconnected(() => {
      this.hubConnection.invoke('GetActiveWorkItems')
        .then((result) => {
          this.items.set(result);
          this.notifyStatusChanged(undefined);
        })
        .catch((error) => {
          console.error('Error fetching items after reconnect:', error);
          this.notifyStatusChanged('error');
        });
    });

    this.hubConnection.onclose((err?) => {
      this.notifyStatusChanged('error');
      if (err) {
        console.error(err);
      }
    });

    this.hubConnection.on('Hello', this.hubHello.bind(this));
    this.hubConnection.on('WorkItemCreated', this.workItemCreated.bind(this));
    this.hubConnection.on('WorkItemUpdated', this.workItemUpdated.bind(this));
    this.hubConnection.on('WorkItemCompleted', this.workItemCompleted.bind(this));
  }

  private hubHello() {
    //console.log('Hello: Work Items Hub');
  }

  private workItemCreated(workItem: ClientWorkItem) {
    this.updateItems(workItem);
  }

  private workItemUpdated(workItem: ClientWorkItem) {
    this.updateItems(workItem);
  }

  private workItemCompleted(workItem: ClientWorkItem) {
    if (workItem.type === ClientWorkItemType.CreatePrescriptions) {
      if (workItem.status === ClientWorkItemStatus.Completed) {
        if (!workItem.warnings)
          this.toastr.success('Wystawiono receptę');
        else
          this.toastr.success('Wystawiono receptę (z ostrzeżeniami)');
      }
      if (workItem.status === ClientWorkItemStatus.Failed)
        this.toastr.error('Błąd podczas wystawiania recepty');
    } else {
      if (workItem.status === ClientWorkItemStatus.Completed)
        this.toastr.success('Zakończono zadanie');
      if (workItem.status === ClientWorkItemStatus.Failed)
        this.toastr.error('Zadanie zakończone błędem');
    }

    this.completed.set(workItem);
    this.updateItems(workItem);
  }

  private notifyStatusChanged(status: HubStatus) {
    this.status.set(status);
  }

  private updateItems(workItem: ClientWorkItem) {
    this.items.update(items => {
      const index = items.findIndex(x => x.id === workItem.id);
      if (index >= 0) {
        const updatedItems = [...items];
        updatedItems[index] = workItem;
        return updatedItems;
      } else {
        return [...items, workItem];
      }
    })
  }
}
