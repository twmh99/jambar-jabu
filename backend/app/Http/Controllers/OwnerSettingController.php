<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class OwnerSettingController extends Controller
{
    public function show(Request $request)
    {
        $this->authorizeOwner($request);
        return response()->json($this->payload(), 200);
    }

    public function update(Request $request)
    {
        $this->authorizeOwner($request);
        $data = $request->validate([
            'buffer_before_start' => 'required|integer|min:30|max:60',
            'buffer_after_end'    => 'required|integer|min:30|max:240',
            'latitude'            => 'required|numeric|between:-90,90',
            'longitude'           => 'required|numeric|between:-180,180',
            'radius_m'            => 'required|integer|min:50|max:100',
        ]);

        Setting::setValue('attendance_buffer_before_start', (string) $data['buffer_before_start']);
        Setting::setValue('attendance_buffer_after_end', (string) $data['buffer_after_end']);
        Setting::setValue('attendance_geofence_latitude', (string) $data['latitude']);
        Setting::setValue('attendance_geofence_longitude', (string) $data['longitude']);
        Setting::setValue('attendance_geofence_radius_m', (string) $data['radius_m']);

        return response()->json([
            'message' => 'Pengaturan absensi berhasil diperbarui.',
            'data'    => $this->payload(),
        ], 200);
    }

    public function attendanceSettings()
    {
        return response()->json($this->payload());
    }

    private function payload(): array
    {
        $radius = (int) Setting::getNumericWithMigration('attendance_geofence_radius_m', 50, [200, 100]);

        return [
            'buffer_before_start' => (int) Setting::getValue('attendance_buffer_before_start', 30),
            'buffer_after_end'    => (int) Setting::getValue('attendance_buffer_after_end', 30),
            'latitude'            => Setting::getCoordinate('attendance_geofence_latitude', -7.779071, -6.208864),
            'longitude'           => Setting::getCoordinate('attendance_geofence_longitude', 110.416098, 106.84513),
            'radius_m'            => $radius,
            'requires_geofence'   => $radius > 0,
        ];
    }

    private function authorizeOwner(Request $request): void
    {
        if (($request->user()->role ?? '') !== 'owner') {
            abort(403, 'Hanya owner yang dapat mengakses pengaturan ini.');
        }
    }
}
