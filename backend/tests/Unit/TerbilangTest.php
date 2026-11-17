<?php

namespace Tests\Unit;

use App\Support\Terbilang;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class TerbilangTest extends TestCase
{
    #[DataProvider('kasus')]
    public function test_angka_menjadi_kata(int $angka, string $diharapkan): void
    {
        $this->assertSame($diharapkan, Terbilang::rupiah($angka));
    }

    public static function kasus(): array
    {
        return [
            'satu' => [1, 'Satu rupiah'],
            'sebelas' => [11, 'Sebelas rupiah'],
            'dua belas' => [12, 'Dua belas rupiah'],
            'dua puluh satu' => [21, 'Dua puluh satu rupiah'],
            'seratus' => [100, 'Seratus rupiah'],
            'seratus sebelas' => [111, 'Seratus sebelas rupiah'],
            'seribu' => [1000, 'Seribu rupiah'],
            'seribu satu' => [1001, 'Seribu satu rupiah'],
            'dua ribu' => [2000, 'Dua ribu rupiah'],
            'tiga ratus ribu' => [300000, 'Tiga ratus ribu rupiah'],
            'tiga ratus lima ribu lima ratus' => [305500, 'Tiga ratus lima ribu lima ratus rupiah'],
            'seratus sebelas ribu' => [111111, 'Seratus sebelas ribu seratus sebelas rupiah'],
            'satu juta dua ratus lima puluh ribu' => [1250000, 'Satu juta dua ratus lima puluh ribu rupiah'],
            'lima juta' => [5000000, 'Lima juta rupiah'],
            'sepuluh juta' => [10000000, 'Sepuluh juta rupiah'],
            'dua miliar lima ratus juta' => [2500000000, 'Dua miliar lima ratus juta rupiah'],
        ];
    }
}
