<?php

namespace Tests\Feature\Finance;

use Tests\TestCase;

class TimezoneTest extends TestCase
{
    public function test_zona_waktu_aplikasi_adalah_wib(): void
    {
        $this->assertSame('Asia/Jakarta', config('app.timezone'));
        $this->assertSame('Asia/Jakarta', date_default_timezone_get());
        $this->assertSame('Asia/Jakarta', now()->timezoneName);
    }
}
