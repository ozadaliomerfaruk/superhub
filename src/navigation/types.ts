import { NavigatorScreenParams } from '@react-navigation/native';
import { UUID } from '../types';

// Bottom Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Timeline: undefined;
  QuickAdd: undefined;
  Workers: undefined;
  Settings: undefined;
};

// Root Stack Navigator
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  PropertyDetail: { propertyId: UUID };
  RoomDetail: { roomId: UUID; propertyId: UUID };
  AssetDetail: { assetId: UUID };
  WorkerDetail: { workerId: UUID };
  ExpenseDetail: { expenseId: UUID };
  AddProperty: undefined;
  EditProperty: { propertyId: UUID };
  AddRoom: { propertyId: UUID };
  EditRoom: { roomId: UUID };
  AddAsset: { propertyId: UUID; roomId?: UUID };
  EditAsset: { assetId: UUID };
  AddExpense: { propertyId: UUID; roomId?: UUID; assetId?: UUID; workerId?: UUID };
  EditExpense: { expenseId: UUID };
  AddWorker: undefined;
  EditWorker: { workerId: UUID };
  Emergency: { propertyId: UUID };
  Search: undefined;
  Maintenance: { propertyId: UUID };
  AllTasks: undefined;
  PaintCodes: { propertyId: UUID; roomId?: UUID };
  Measurements: { propertyId: UUID; roomId?: UUID };
  StorageBoxes: { propertyId: UUID };
  WiFiInfo: { propertyId: UUID };
  Documents: { propertyId: UUID; assetId?: UUID };
  Renovations: { propertyId: UUID };
  BillTemplates: { propertyId: UUID };
  Notifications: undefined;
  PropertyExpenses: { propertyId: UUID };
  PropertyAssets: { propertyId: UUID };
  Notes: { propertyId: UUID };
  Reports: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
