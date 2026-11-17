<?php

namespace App\Support;

/** Angka menjadi kata dalam bahasa Indonesia, mis. 300000 → "Tiga ratus ribu rupiah" (untuk kwitansi). */
final class Terbilang
{
    private const ANGKA = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

    public static function rupiah(int $nilai): string
    {
        return ucfirst(self::kata($nilai)).' rupiah';
    }

    public static function kata(int $n): string
    {
        if ($n < 0) {
            return 'minus '.self::kata(-$n);
        }
        if ($n === 0) {
            return 'nol';
        }
        if ($n < 12) {
            return self::ANGKA[$n];
        }
        if ($n < 20) {
            return self::ANGKA[$n - 10].' belas';
        }
        if ($n < 100) {
            return self::ANGKA[intdiv($n, 10)].' puluh'.self::sisa($n % 10);
        }
        if ($n < 200) {
            return 'seratus'.self::sisa($n - 100);
        }
        if ($n < 1000) {
            return self::ANGKA[intdiv($n, 100)].' ratus'.self::sisa($n % 100);
        }
        if ($n < 2000) {
            return 'seribu'.self::sisa($n - 1000);
        }
        if ($n < 1_000_000) {
            return self::kata(intdiv($n, 1000)).' ribu'.self::sisa($n % 1000);
        }
        if ($n < 1_000_000_000) {
            return self::kata(intdiv($n, 1_000_000)).' juta'.self::sisa($n % 1_000_000);
        }
        if ($n < 1_000_000_000_000) {
            return self::kata(intdiv($n, 1_000_000_000)).' miliar'.self::sisa($n % 1_000_000_000);
        }

        return self::kata(intdiv($n, 1_000_000_000_000)).' triliun'.self::sisa($n % 1_000_000_000_000);
    }

    private static function sisa(int $n): string
    {
        return $n === 0 ? '' : ' '.self::kata($n);
    }
}
