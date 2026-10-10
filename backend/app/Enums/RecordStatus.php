<?php

namespace App\Enums;

enum RecordStatus: string
{
    case Valid = 'valid';
    case Void = 'void';
}
