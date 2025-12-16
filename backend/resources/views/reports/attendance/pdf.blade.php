<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 60px 40px 70px 40px; }
        * { box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #1f2937; }
        header { position: fixed; top: -40px; left: 0; right: 0; height: 55px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; background: #fff; }
        header table { border-collapse: separate; border-spacing: 0 3px; }
        header td { border: 0; padding: 0; }
        footer { position: fixed; bottom: -40px; left: 0; right: 0; height: 45px; border-top: 1px solid #d1d5db; font-size: 10px; color: #6b7280; display: flex; justify-content: space-between; align-items: center; }
        h1 { margin: 0; font-size: 18px; color: #0f172a; }
        h2 { font-size: 13px; color: #0f172a; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: .5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th, td { padding: 6px 8px; border: 1px solid #e5e7eb; }
        th { background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 11px; }
        .meta-table td { border: 1px solid #dbeafe; font-size: 11px; padding: 5px 8px; }
        .meta-table td strong { display: block; font-size: 10px; letter-spacing: .4px; color: #475569; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
        .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 9px; background: #f8fafc; min-height: 65px; }
        .summary-card .label { font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; letter-spacing:.5px; }
        .summary-card .value { font-size: 18px; font-weight: bold; color: #0f172a; }
        .insights { border: 1px solid #dbeafe; background: #eff6ff; padding: 10px 12px; border-radius: 8px; font-size: 11px; }
        .insights ul { margin: 0; padding-left: 16px; }
        .chart-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .mini-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
        .mini-table th { background: #0f172a; color: #fff; font-size: 10px; }
        .bar { height: 10px; background: #93c5fd; display: inline-block; border-radius: 5px; }
        .heatmap-table th { background: #f1f5f9; color: #0f172a; border: 1px solid #e5e7eb; font-size: 10px; }
        .heatmap-table td { text-align: center; font-size: 10px; padding: 4px; border: 1px solid #e5e7eb; }
        .heatmap-table td span { display: block; padding: 3px 0; border-radius: 4px; }
        .page-break { page-break-after: always; }
        main { margin-top: 70px; }
        section { margin-bottom: 18px; page-break-inside: avoid; }
        .detail-table tbody tr td { font-size: 11px; }
        .detail-table tbody tr td:last-child { width: 160px; }
    </style>
</head>
<body>
    <header>
        <table width="100%">
            <tr>
                <td>
                    <strong>Jambar Jabu</strong><br>
                    Sistem Manajemen Pegawai SMPJ
                </td>
                <td style="text-align:right;">
                    <h1>{{ $header['title'] }}</h1>
                    <div style="font-size:12px; color:#475569;">{{ $meta['period_label'] }}</div>
                </td>
            </tr>
        </table>
    </header>

    <footer>
        <div>SMPJ &copy; {{ date('Y') }} • Dokumen: {{ $meta['doc_number'] }}</div>
        <div>Sistem Manajemen Pegawai Jambar Jabu</div>
    </footer>

    <main>
        <section>
            <table width="100%" class="meta-table">
                <tr>
                    <td width="25%"><strong>Periode</strong>{{ $meta['period_label'] }}</td>
                    <td width="25%"><strong>Tanggal Generate</strong>{{ $meta['generated_at'] }}</td>
                    <td width="25%"><strong>Dibuat oleh</strong>{{ $meta['generated_by'] }}</td>
                    <td width="25%"><strong>Nomor Dokumen</strong>{{ $meta['doc_number'] }}</td>
                </tr>
            </table>
        </section>

        <section>
            <h2>Ringkasan Kehadiran</h2>
            <div class="summary-grid">
                <div class="summary-card"><div class="label">Pegawai Aktif</div><div class="value">{{ $summary['total_pegawai'] }}</div></div>
                <div class="summary-card"><div class="label">Total Hadir</div><div class="value">{{ $summary['total_hadir'] }}</div></div>
                <div class="summary-card"><div class="label">Total Absen</div><div class="value">{{ $summary['total_absen'] }}</div></div>
                <div class="summary-card"><div class="label">Total Terlambat</div><div class="value">{{ $summary['total_telat'] }}</div></div>
                <div class="summary-card"><div class="label">Total Lembur (jam)</div><div class="value">{{ number_format($summary['total_lembur'], 2) }}</div></div>
            </div>
        </section>

        <section>
            <h2>Auto Insight</h2>
            <div class="insights">
                <ul>
                    @forelse($insights as $insight)
                        <li>{{ $insight }}</li>
                    @empty
                        <li>Data pada periode ini belum cukup untuk insight otomatis.</li>
                    @endforelse
                </ul>
            </div>
        </section>

        @php
            $attendanceItems = collect($charts['attendance'] ?? []);
            $maxAttendance = max(1, $attendanceItems->max('hadir') ?? 1);
            $heatmap = collect($charts['heatmap'] ?? []);
            $buckets = $heatmap->flatMap(fn($records) => collect($records)->keys())->unique()->sort()->values();
        @endphp

        <section>
            <h2></h2>
            <h2>Grafik Ringkas</h2>
            <div class="chart-row">
                <div>
                    <strong>Jumlah Kehadiran per Hari</strong>
                    <table width="100%">
                        @foreach($attendanceItems as $day)
                            <tr>
                                <td style="width:35%;">{{ $day['label'] }}</td>
                                <td>
                                    <span class="bar" style="width: {{ ($day['hadir'] / $maxAttendance) * 100 }}%;"></span>
                                    <span style="font-size:10px;">{{ $day['hadir'] }} hadir</span>
                                </td>
                            </tr>
                        @endforeach
                    </table>
                </div>
                <div>
                    <strong>Heatmap Jam Masuk</strong>
                    @if($heatmap->isNotEmpty())
                        <table class="heatmap-table" width="100%">
                            <tr>
                                <th style="width:100px;">Hari</th>
                                @foreach($buckets as $bucket)
                                    <th style="width:45px;">{{ $bucket }}</th>
                                @endforeach
                            </tr>
                            @foreach($heatmap as $weekday => $records)
                                <tr>
                                    <td>{{ $weekday }}</td>
                                    @foreach($buckets as $bucket)
                                        @php $value = $records[$bucket] ?? 0; @endphp
                                        <td>
                                            @if($value)
                                                <span style="background: rgba(59,130,246, {{ min(1, $value / 5) }}); color:#0f172a;">{{ $value }}</span>
                                            @else
                                                <span style="color:#cbd5f5;">-</span>
                                            @endif
                                        </td>
                                    @endforeach
                                </tr>
                            @endforeach
                        </table>
                    @else
                        <p style="font-size:11px;color:#94a3b8;margin:4px 0;">Belum ada data jam masuk untuk periode ini.</p>
                    @endif
                </div>
            </div>
        </section>

        <section class="page-break">
            <h2>Rekap Per Shift</h2>
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>Shift</th>
                        <th>Total Hadir</th>
                        <th>Total Telat</th>
                        <th>Total Absen</th>
                        <th>Lembur (jam)</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($shift_recap as $shift)
                        <tr>
                            <td>{{ $shift['shift'] }}</td>
                            <td>{{ $shift['hadir'] }}</td>
                            <td>{{ $shift['telat'] }}</td>
                            <td>{{ $shift['absen'] }}</td>
                            <td>{{ number_format($shift['lembur'], 2) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="5">Belum ada data shift.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </section>

        <section>
            <h2></h2>
            <h2>Tabel Detail Per Pegawai</h2>
            <table>
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>ID</th>
                        <th>Nama</th>
                        <th>Shift</th>
                        <th>Jam Masuk</th>
                        <th>Jam Keluar</th>
                        <th>Durasi</th>
                        <th>Status</th>
                        <th>Keterangan</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($rows as $row)
                        <tr>
                            <td>{{ $row['tanggal'] }}</td>
                            <td>{{ $row['pegawai_id'] }}</td>
                            <td>{{ $row['pegawai_nama'] }}</td>
                            <td>{{ $row['shift'] }}</td>
                            <td>{{ $row['jam_masuk'] ?? '-' }}</td>
                            <td>{{ $row['jam_keluar'] ?? '-' }}</td>
                            <td style="text-align:right;">{{ number_format($row['durasi'], 2) }}</td>
                            <td>{{ $row['status'] }}</td>
                            <td>{{ $row['keterangan'] ?? '-' }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="9">Belum ada data absensi untuk periode ini.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </section>
    </main>

    <script type="text/php">
        if (isset($pdf)) {
            $text = "Halaman {PAGE_NUM} / {PAGE_COUNT}";
            $pdf->page_text(500, 820, $text, null, 10, array(0,0,0));
        }
    </script>
</body>
</html>
