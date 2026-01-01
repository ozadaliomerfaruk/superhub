import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';

// Property screens
import { PropertyDetailScreen } from '../screens/properties/PropertyDetailScreen';
import { AddPropertyScreen } from '../screens/properties/AddPropertyScreen';
import { EditPropertyScreen } from '../screens/properties/EditPropertyScreen';

// Room screens
import { RoomDetailScreen } from '../screens/rooms/RoomDetailScreen';
import { AddRoomScreen } from '../screens/rooms/AddRoomScreen';
import { EditRoomScreen } from '../screens/rooms/EditRoomScreen';

// Asset screens
import { AddAssetScreen, AssetDetailScreen, EditAssetScreen, PropertyAssetsScreen } from '../screens/assets';

// Expense screens
import { AddExpenseScreen, ExpenseDetailScreen, EditExpenseScreen, PropertyExpensesScreen } from '../screens/expenses';

// Worker screens
import { AddWorkerScreen, WorkerDetailScreen, EditWorkerScreen } from '../screens/workers';

// Emergency screens
import { EmergencyScreen } from '../screens/emergency';

// Utility screens
import { MaintenanceScreen, AllTasksScreen } from '../screens/maintenance';
import { PaintCodesScreen } from '../screens/paint-codes';
import { MeasurementsScreen } from '../screens/measurements';
import { StorageBoxesScreen } from '../screens/storage-boxes';
import { WiFiInfoScreen } from '../screens/wifi-info';
import { SearchScreen } from '../screens/search';
import { DocumentsScreen } from '../screens/documents';
import { RenovationsScreen } from '../screens/renovations';
import { BillTemplatesScreen } from '../screens/bills';
import { NotificationsScreen } from '../screens/notifications';
import { NotesScreen } from '../screens/notes';
import { ReportsScreen } from '../screens/reports';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />

      {/* Property screens */}
      <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
      <Stack.Screen
        name="AddProperty"
        component={AddPropertyScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditProperty"
        component={EditPropertyScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />

      {/* Room screens */}
      <Stack.Screen name="RoomDetail" component={RoomDetailScreen} />
      <Stack.Screen
        name="AddRoom"
        component={AddRoomScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditRoom"
        component={EditRoomScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />

      {/* Asset screens */}
      <Stack.Screen name="AssetDetail" component={AssetDetailScreen} />
      <Stack.Screen
        name="AddAsset"
        component={AddAssetScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditAsset"
        component={EditAssetScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />

      {/* Expense screens */}
      <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditExpense"
        component={EditExpenseScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />

      {/* Worker screens */}
      <Stack.Screen name="WorkerDetail" component={WorkerDetailScreen} />
      <Stack.Screen
        name="AddWorker"
        component={AddWorkerScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditWorker"
        component={EditWorkerScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />

      {/* Utility screens */}
      <Stack.Screen name="Emergency" component={EmergencyScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Maintenance" component={MaintenanceScreen} />
      <Stack.Screen name="AllTasks" component={AllTasksScreen} />
      <Stack.Screen name="PaintCodes" component={PaintCodesScreen} />
      <Stack.Screen name="Measurements" component={MeasurementsScreen} />
      <Stack.Screen name="StorageBoxes" component={StorageBoxesScreen} />
      <Stack.Screen name="WiFiInfo" component={WiFiInfoScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="Renovations" component={RenovationsScreen} />
      <Stack.Screen name="BillTemplates" component={BillTemplatesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="PropertyExpenses" component={PropertyExpensesScreen} />
      <Stack.Screen name="PropertyAssets" component={PropertyAssetsScreen} />
      <Stack.Screen name="Notes" component={NotesScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
    </Stack.Navigator>
  );
}
